import { jsPDF } from 'jspdf';
import type { AppEdge, AppNode, BreakerComponent, LoadComponent, SwitchComponent } from '../types/electrical';

export interface SubBranch {
  id: string;
  type: 'lighting_simple' | 'lighting_two_way' | 'lighting_intermediate' | 'buzzer' | 'socket' | 'power_socket' | 'generic';
  name: string;
  switches: AppNode[];
  loads: AppNode[];
  wireCount: number; // 2 o 3 conductores
  wireSectionMm2: number;
}

export interface CircuitBranch {
  id: string;
  name: string;
  breaker?: AppNode;
  ratedAmps: number;
  curve: string;
  subBranches: SubBranch[];
}

/**
 * Traza arcos suaves para semicírculos sin depender de firmas incompatibles de jsPDF
 */
function drawArc(
  doc: jsPDF,
  x: number,
  y: number,
  r: number,
  startAngleRad: number,
  endAngleRad: number,
  segments = 16
) {
  const step = (endAngleRad - startAngleRad) / segments;
  for (let i = 0; i < segments; i++) {
    const a1 = startAngleRad + i * step;
    const a2 = startAngleRad + (i + 1) * step;
    doc.line(
      x + r * Math.cos(a1),
      y + r * Math.sin(a1),
      x + r * Math.cos(a2),
      y + r * Math.sin(a2)
    );
  }
}

/**
 * Analiza el circuito del canvas y estructura sub-ramas lógicas (Interruptor -> Lámpara, Tomas, etc.)
 */
function analyzeCircuitTopology(nodes: AppNode[], edges: AppEdge[]): {
  source?: AppNode;
  mainBreakers: AppNode[]; // IGA, PCS, RCD
  circuits: CircuitBranch[];
} {
  const source = nodes.find((n) => n.data.type === 'source');
  const breakers = nodes.filter((n) => n.data.type === 'breaker');
  const allSwitches = nodes.filter((n) => n.data.type === 'switch');
  const allLoads = nodes.filter((n) => n.data.type === 'load');

  const mainBreakers = breakers.filter((b) => {
    const bt = (b.data as BreakerComponent).breakerType;
    return bt === 'iga' || bt === 'pcs' || bt === 'rcd';
  });

  const branchBreakers = breakers.filter((b) => {
    const bt = (b.data as BreakerComponent).breakerType;
    return bt === 'circuit_breaker' || bt === 'fuse';
  });

  const circuits: CircuitBranch[] = [];

  const buildSubBranches = (bNode: AppNode | undefined, subSwitches: AppNode[], subLoads: AppNode[]): SubBranch[] => {
    const subBranches: SubBranch[] = [];
    const usedLoads = new Set<string>();
    const usedSwitches = new Set<string>();

    const bData = bNode ? (bNode.data as BreakerComponent) : null;
    const defaultAmps = bData ? bData.ratedCurrent : 10;
    let section = 1.5;
    if (defaultAmps >= 25) section = 6.0;
    else if (defaultAmps >= 20) section = 4.0;
    else if (defaultAmps >= 16) section = 2.5;

    // 1. Detectar cadenas de conmutadas y cruzamientos
    const twoWayAndCross = subSwitches.filter((s) => {
      const st = (s.data as SwitchComponent).switchType;
      return st === 'two_way' || st === 'intermediate';
    });

    if (twoWayAndCross.length >= 2) {
      // Agrupar conmutadores emparejados
      const chainSwitches = [...twoWayAndCross];
      chainSwitches.forEach((s) => usedSwitches.add(s.id));

      // Buscar lámpara asociada
      const targetLamp = subLoads.find((l) => (l.data as LoadComponent).loadType === 'lamp' && !usedLoads.has(l.id));
      if (targetLamp) usedLoads.add(targetLamp.id);

      const isIntermediate = chainSwitches.some((s) => (s.data as SwitchComponent).switchType === 'intermediate');
      subBranches.push({
        id: `branch-tw-${chainSwitches[0].id}`,
        type: isIntermediate ? 'lighting_intermediate' : 'lighting_two_way',
        name: isIntermediate ? 'Alumbrado Conmutado de Cruce (3 puntos)' : 'Alumbrado Conmutado (2 puntos)',
        switches: chainSwitches,
        loads: targetLamp ? [targetLamp] : [],
        wireCount: 3,
        wireSectionMm2: section,
      });
    }

    // 2. Detectar interruptores simples y pulsadores
    const singleSwitches = subSwitches.filter((s) => !usedSwitches.has(s.id));
    for (const sw of singleSwitches) {
      usedSwitches.add(sw.id);
      const swData = sw.data as SwitchComponent;

      if (swData.switchType === 'pushbutton') {
        const buzzer = subLoads.find((l) => (l.data as LoadComponent).loadType === 'buzzer' && !usedLoads.has(l.id));
        if (buzzer) usedLoads.add(buzzer.id);

        subBranches.push({
          id: `branch-pb-${sw.id}`,
          type: 'buzzer',
          name: 'Timbre / Zumbador',
          switches: [sw],
          loads: buzzer ? [buzzer] : [],
          wireCount: 2,
          wireSectionMm2: section,
        });
      } else {
        const lamp = subLoads.find((l) => (l.data as LoadComponent).loadType === 'lamp' && !usedLoads.has(l.id));
        if (lamp) usedLoads.add(lamp.id);

        subBranches.push({
          id: `branch-single-${sw.id}`,
          type: 'lighting_simple',
          name: `Alumbrado Simple (${swData.name})`,
          switches: [sw],
          loads: lamp ? [lamp] : [],
          wireCount: 3,
          wireSectionMm2: section,
        });
      }
    }

    // 3. Detectar tomas de corriente y cargas restantes
    const remainingLoads = subLoads.filter((l) => !usedLoads.has(l.id));
    for (const lNode of remainingLoads) {
      usedLoads.add(lNode.id);
      const lData = lNode.data as LoadComponent;

      if (lData.loadType === 'socket') {
        const isPower = lData.ratedPowerWatts >= 2500 || defaultAmps >= 25;
        subBranches.push({
          id: `branch-sock-${lNode.id}`,
          type: isPower ? 'power_socket' : 'socket',
          name: lData.name,
          switches: [],
          loads: [lNode],
          wireCount: 3,
          wireSectionMm2: isPower ? 6.0 : section >= 2.5 ? section : 2.5,
        });
      } else {
        subBranches.push({
          id: `branch-load-${lNode.id}`,
          type: 'lighting_simple',
          name: lData.name,
          switches: [],
          loads: [lNode],
          wireCount: 3,
          wireSectionMm2: section,
        });
      }
    }

    // Si no había nada, crear una rama básica por defecto
    if (subBranches.length === 0) {
      subBranches.push({
        id: 'branch-default',
        type: defaultAmps >= 16 ? 'socket' : 'lighting_simple',
        name: defaultAmps >= 16 ? 'Toma de Corriente 2P+T 16A' : 'Punto de Luz',
        switches: [],
        loads: [],
        wireCount: 3,
        wireSectionMm2: section,
      });
    }

    return subBranches;
  };

  if (branchBreakers.length > 0) {
    for (const bNode of branchBreakers) {
      const bData = bNode.data as BreakerComponent;

      // Buscar nodos aguas abajo conectados a este PIA
      const downstreamLoads: AppNode[] = [];
      const downstreamSwitches: AppNode[] = [];

      const visited = new Set<string>([bNode.id]);
      const queue = [bNode.id];

      while (queue.length > 0) {
        const currId = queue.shift()!;
        const neighbors = edges
          .filter((e) => e.source === currId || e.target === currId)
          .map((e) => (e.source === currId ? e.target : e.source));

        for (const nId of neighbors) {
          if (!visited.has(nId)) {
            visited.add(nId);
            const nNode = nodes.find((n) => n.id === nId);
            if (nNode) {
              if (nNode.data.type === 'load') {
                downstreamLoads.push(nNode);
              } else if (nNode.data.type === 'switch') {
                downstreamSwitches.push(nNode);
                queue.push(nId);
              } else if (nNode.data.type === 'junction') {
                queue.push(nId);
              }
            }
          }
        }
      }

      circuits.push({
        id: bNode.id,
        name: bData.name,
        breaker: bNode,
        ratedAmps: bData.ratedCurrent,
        curve: bData.curve || 'C',
        subBranches: buildSubBranches(bNode, downstreamSwitches, downstreamLoads),
      });
    }
  } else {
    // Sin PIAs individuales: todo en un circuito maestro
    circuits.push({
      id: 'main-circuit',
      name: 'Circuito de Distribución',
      ratedAmps: 10,
      curve: 'C',
      subBranches: buildSubBranches(undefined, allSwitches, allLoads),
    });
  }

  return { source, mainBreakers, circuits };
}

/**
 * Dibuja el marco técnico y el cajetín oficial en cada página
 */
function drawPageTemplate(
  doc: jsPDF,
  planType: 'UNIFILAR' | 'MULTIFILAR',
  circuitName: string,
  pageNum: number,
  totalPages: number
) {
  // Marco A4 Landscape
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.6);
  doc.rect(12, 12, 273, 186);

  doc.setDrawColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.2);
  doc.rect(14, 14, 269, 182);

  // Cajetín normalizado REBT / UNE 1035 en la parte inferior
  const x = 14;
  const y = 172;
  const w = 269;
  const h = 24;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h);

  // Líneas divisorias
  doc.line(x + 115, y, x + 115, y + h);
  doc.line(x + 195, y, x + 195, y + h);
  doc.line(x + 115, y + 12, x + w, y + 12);

  // Bloque Izquierdo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('INSTALACIÓN ELÉCTRICA EN BAJA TENSIÓN (REBT)', x + 4, y + 5.5);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`ESQUEMA ELÉCTRICO ${planType}`, x + 4, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Normativa: R.D. 842/2002 (REBT) - Simbología según UNE-EN 60617', x + 4, y + 16);
  doc.text(`Proyecto: ${circuitName.slice(0, 50)}`, x + 4, y + 20.5);

  // Bloque Central
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TÉCNICO / INSTALADOR:', x + 118, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Taller de Electricidad / F.P. Electrotecnia', x + 118, y + 9);

  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`FECHA: ${dateStr}`, x + 118, y + 16.5);
  doc.text('ESCALA: S/E (Esquemático)', x + 118, y + 21);

  // Bloque Derecho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TIPO DE PLANO:', x + 198, y + 4.5);
  doc.setFontSize(9);
  doc.setTextColor(2, 132, 199);
  doc.text(planType === 'UNIFILAR' ? 'UNIFILAR NORMALIZADO' : 'MULTIFILAR DE CONEXIÓN', x + 198, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`HOJA: ${pageNum} de ${totalPages}`, x + 198, y + 16.5);
  doc.text('REF: REBT-EL-01', x + 198, y + 21);
}

// ============================================================================
// SIMBOLOGÍA UNIFILAR PRECISA (UNE-EN 60617 / IMAGEN 1, 2, 3)
// ============================================================================

function drawUnifilarPIA(doc: jsPDF, x: number, y: number, amps: number, label: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  // Línea entrada
  doc.line(x, y, x, y + 3);

  // Contacto abierto
  doc.circle(x, y + 3.8, 0.7);
  doc.line(x, y + 3.8, x + 3.5, y + 10);

  // Bimetal térmico y flecha magnética
  doc.line(x + 1.8, y + 7.2, x + 3.2, y + 7.2);
  doc.line(x + 3.2, y + 7.2, x + 3.2, y + 8.5);

  doc.line(x + 2.2, y + 8.5, x + 4.5, y + 8.5);
  doc.line(x + 4.5, y + 8.5, x + 3.8, y + 8);
  doc.line(x + 4.5, y + 8.5, x + 3.8, y + 9);

  // Borne salida
  doc.circle(x, y + 11.5, 0.7);
  doc.line(x, y + 11.5, x, y + 14);

  // Rotulación clara al lado derecho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2 x ${amps} A`, x + 5.5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.slice(0, 18), x + 5.5, y + 11);
}

function drawUnifilarSwitchSymbol(
  doc: jsPDF,
  x: number,
  y: number,
  type: SwitchComponent['switchType'],
  name: string
) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);

  const r = 2.5;
  doc.circle(x, y, r);

  if (type === 'single_pole') {
    // Interruptor simple: trazo oblicuo con gancho simple (Imagen 2)
    doc.line(x - 1.8, y + 1.8, x + 3.5, y - 3.5);
    doc.line(x + 3.5, y - 3.5, x + 3.5, y - 5.5);
  } else if (type === 'two_way') {
    // Conmutador: trazo diagonal con 2 ganchos opuestos (Imagen 2 y 3)
    doc.line(x - 3.5, y + 3.5, x + 3.5, y - 3.5);
    doc.line(x - 3.5, y + 3.5, x - 3.5, y + 5.5);
    doc.line(x + 3.5, y - 3.5, x + 3.5, y - 5.5);
  } else if (type === 'intermediate') {
    // Cruzamiento: aspa en 'X' con 2 ganchos cruzados (Imagen 2 y 3)
    doc.line(x - 3, y + 3, x + 3, y - 3);
    doc.line(x - 3, y - 3, x + 3, y + 3);
    doc.line(x + 3, y - 3, x + 4.5, y - 3);
    doc.line(x - 3, y + 3, x - 4.5, y + 3);
  } else if (type === 'pushbutton') {
    // Pulsador: círculo concéntrico
    doc.circle(x, y, 1.2);
  }

  // Nombre rotulado claramente ARRIBA del símbolo para no colisionar con conductores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name.slice(0, 14), x, y - 4, { align: 'center' });
}

function drawUnifilarLampSymbol(doc: jsPDF, x: number, y: number, name: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  // Aspa 'X' simple (Imagen 1)
  const r = 3.5;
  doc.line(x - r, y - r, x + r, y + r);
  doc.line(x - r, y + r, x + r, y - r);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name.slice(0, 16), x, y + 6.5, { align: 'center' });
}

function drawUnifilarSocketSymbol(doc: jsPDF, x: number, y: number, name: string, isPower = false) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  const r = 3.5;
  drawArc(doc, x, y, r, 0, Math.PI);
  doc.line(x - r, y, x + r, y);
  doc.line(x, y, x, y - 3.5);

  if (isPower) {
    doc.line(x - 2, y - 2, x + 2, y - 2);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name.slice(0, 16), x, y + 6.5, { align: 'center' });
}

function drawCanalizacionSlash(doc: jsPDF, x: number, y: number, wireCount = 3, section = 1.5) {
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.35);

  const spacing = 1.2;
  const startX = x - ((wireCount - 1) * spacing) / 2;
  for (let i = 0; i < wireCount; i++) {
    doc.line(startX + i * spacing - 1.2, y + 2, startX + i * spacing + 1.2, y - 2);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  const tag = section >= 6 ? `3G${section}` : `${wireCount}x${section}+T`;
  doc.text(tag, x, y - 3, { align: 'center' });
}

// ============================================================================
// SIMBOLOGÍA MULTIFILAR PRECISA (UNE-EN 60617 / IMAGEN 1, 2, 4)
// ============================================================================

function drawMultifilarPIASymbol(doc: jsPDF, x: number, y: number, amps: number, label: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  const pL = x - 4;
  const pN = x + 4;

  // Bornes entrada
  doc.circle(pL, y, 0.6);
  doc.circle(pN, y, 0.6);

  // Cuchillas
  doc.line(pL, y, pL + 2.5, y + 7);
  doc.line(pN, y, pN + 2.5, y + 7);

  // Mecanismo térmico y magnético en polo L
  doc.line(pL + 1.2, y + 3.8, pL + 2.6, y + 3.8);
  doc.line(pL + 2.6, y + 3.8, pL + 2.6, y + 5);
  doc.line(pL + 1.5, y + 5.2, pL + 3.5, y + 5.2);

  // Barra de acoplamiento mecánico discontinua
  doc.setDrawColor(148, 163, 184);
  if (doc.setLineDashPattern) doc.setLineDashPattern([1, 1], 0);
  doc.line(pL + 1.5, y + 3.5, pN + 1.5, y + 3.5);
  if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
  doc.setDrawColor(15, 23, 42);

  // Bornes salida
  doc.circle(pL, y + 10, 0.6);
  doc.circle(pN, y + 10, 0.6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`2x${amps} A`, x + 7, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.slice(0, 16), x + 7, y + 9);
}

function drawMultifilarLampSymbol(doc: jsPDF, x: number, y: number, name: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  const r = 3.5;
  doc.circle(x, y, r);
  const d = r * 0.707;
  doc.line(x - d, y - d, x + d, y + d);
  doc.line(x - d, y + d, x + d, y - d);

  // Bornes de conexión izquierdo y derecho
  doc.circle(x - r, y, 0.6, 'FD');
  doc.circle(x + r, y, 0.6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name.slice(0, 16), x, y + 6.5, { align: 'center' });
}

function drawMultifilarSocketSymbol(doc: jsPDF, x: number, y: number, name: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  const r = 4;
  doc.circle(x, y, r);

  // Bornes de enchufe L y N
  doc.circle(x - 1.8, y + 0.8, 0.7, 'FD');
  doc.circle(x + 1.8, y + 0.8, 0.7, 'FD');

  // Borne de tierra PE superior
  doc.line(x, y - r, x, y - 1.8);
  doc.circle(x, y - 1.8, 0.6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name.slice(0, 16), x, y + 7, { align: 'center' });
}

// ============================================================================
// EXPORTADOR ESQUEMA UNIFILAR (MULTILÁMINA INTELIGENTE)
// ============================================================================

export function exportUnifilarPdf(
  nodes: AppNode[],
  edges: AppEdge[],
  circuitName = 'Circuito Eléctrico'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const topology = analyzeCircuitTopology(nodes, edges);

  // Dividir circuitos en páginas de máximo 3 circuitos por lámina para garantizar aire y alineación
  const circuitsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(topology.circuits.length / circuitsPerPage));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    drawPageTemplate(doc, 'UNIFILAR', circuitName, page + 1, totalPages);

    const pageCircuits = topology.circuits.slice(page * circuitsPerPage, (page + 1) * circuitsPerPage);

    // Barra de distribución general superior
    const startX = 24;
    const endX = 270;
    const busY = 28;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.7);
    doc.line(startX, busY, endX, busY);

    doc.circle(startX, busY, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('RED GENERAL 230 V ~ 50 Hz', startX + 3, busY - 3);

    // Si es la primera página y hay IGA / RCD, dibujarlos en cabecera
    if (page === 0 && topology.mainBreakers.length > 0) {
      let mbX = startX + 65;
      for (const mb of topology.mainBreakers) {
        const bData = mb.data as BreakerComponent;
        if (bData.breakerType === 'iga') {
          drawUnifilarPIA(doc, mbX, busY - 7, bData.ratedCurrent || 40, 'IGA General');
          mbX += 45;
        } else if (bData.breakerType === 'rcd') {
          drawUnifilarPIA(doc, mbX, busY - 7, bData.ratedCurrent || 40, 'Diferencial 30mA');
          mbX += 45;
        }
      }
    }

    // Ancho de columna por cada circuito en esta página
    const colWidth = (endX - startX) / Math.max(1, pageCircuits.length);

    pageCircuits.forEach((circuit, cIdx) => {
      const colCenterX = startX + cIdx * colWidth + colWidth / 2;
      let currY = busY;

      // Nudo de derivación desde barra superior
      doc.circle(colCenterX, currY, 0.9, 'FD');

      // Bajada hacia el PIA
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.line(colCenterX, currY, colCenterX, currY + 10);
      currY += 10;

      // Símbolo PIA
      drawUnifilarPIA(doc, colCenterX, currY, circuit.ratedAmps, circuit.name);
      currY += 14;

      // Canalización vertical principal
      doc.line(colCenterX, currY, colCenterX, currY + 10);
      drawCanalizacionSlash(doc, colCenterX, currY + 5, 3, circuit.subBranches[0]?.wireSectionMm2 || 1.5);
      currY += 10;

      // Dibujar cada sub-rama de forma HORIZONTAL o modular escalonada (exacto Figura 1.52)
      const numBranches = circuit.subBranches.length;
      const branchHeight = Math.min(26, (160 - currY) / Math.max(1, numBranches));

      circuit.subBranches.forEach((branch, bIdx) => {
        const branchY = currY + bIdx * branchHeight + 10;

        // Si hay varias ramas, abrir línea distribuidora vertical
        if (numBranches > 1) {
          doc.line(colCenterX - 12, currY, colCenterX - 12, branchY);
          doc.line(colCenterX - 12, branchY, colCenterX - 5, branchY);
        }

        const bStartX = numBranches > 1 ? colCenterX - 5 : colCenterX - 15;
        const bEndX = colCenterX + colWidth / 2 - 8;

        if (branch.type === 'lighting_simple') {
          const sw = branch.switches[0];
          const lamp = branch.loads[0];
          const swX = (bStartX + bEndX) / 2 - 10;
          const lampX = (bStartX + bEndX) / 2 + 12;

          doc.line(bStartX, branchY, swX - 2.5, branchY);
          drawCanalizacionSlash(doc, (bStartX + swX) / 2, branchY, 3, branch.wireSectionMm2);

          drawUnifilarSwitchSymbol(doc, swX, branchY, 'single_pole', sw ? (sw.data as SwitchComponent).name : 'S1');

          doc.line(swX + 2.5, branchY, lampX - 3.5, branchY);
          drawCanalizacionSlash(doc, (swX + lampX) / 2, branchY, 2, branch.wireSectionMm2);

          drawUnifilarLampSymbol(doc, lampX, branchY, lamp ? (lamp.data as LoadComponent).name : 'L1');
        } else if (branch.type === 'lighting_two_way' || branch.type === 'lighting_intermediate') {
          // Cadena conmutada en línea horizontal continua (exacto Figura 1.52)
          const swList = branch.switches;
          const lamp = branch.loads[0];
          const stepX = (bEndX - bStartX) / (swList.length + 1.2);

          let prevX = bStartX;
          swList.forEach((sw, sIdx) => {
            const nextX = bStartX + (sIdx + 1) * stepX;
            doc.line(prevX, branchY, nextX - 2.5, branchY);
            drawCanalizacionSlash(doc, (prevX + nextX) / 2, branchY, sIdx === 0 ? 3 : 4, branch.wireSectionMm2);

            const st = (sw.data as SwitchComponent).switchType;
            drawUnifilarSwitchSymbol(doc, nextX, branchY, st, (sw.data as SwitchComponent).name);
            prevX = nextX + 2.5;
          });

          // Conexión a la lámpara
          const lampX = bEndX - 4;
          doc.line(prevX, branchY, lampX - 3.5, branchY);
          drawCanalizacionSlash(doc, (prevX + lampX) / 2, branchY, 2, branch.wireSectionMm2);
          drawUnifilarLampSymbol(doc, lampX, branchY, lamp ? (lamp.data as LoadComponent).name : 'L1');
        } else if (branch.type === 'socket' || branch.type === 'power_socket') {
          const sockX = (bStartX + bEndX) / 2;
          doc.line(bStartX, branchY, sockX, branchY - 3.5);
          drawCanalizacionSlash(doc, (bStartX + sockX) / 2, branchY, 3, branch.wireSectionMm2);
          drawUnifilarSocketSymbol(doc, sockX, branchY, branch.name, branch.type === 'power_socket');
        } else if (branch.type === 'buzzer') {
          const swX = (bStartX + bEndX) / 2 - 10;
          const buzX = (bStartX + bEndX) / 2 + 12;

          doc.line(bStartX, branchY, swX - 2.5, branchY);
          drawUnifilarSwitchSymbol(doc, swX, branchY, 'pushbutton', 'Pulsador');

          doc.line(swX + 2.5, branchY, buzX - 4, branchY);
          // Cúpula timbre
          drawArc(doc, buzX, branchY, 3.5, 0, Math.PI);
          doc.line(buzX - 3.5, branchY, buzX + 3.5, branchY);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text('Timbre', buzX, branchY + 6, { align: 'center' });
        }
      });
    });
  }

  const fileName = `Esquema_Unifilar_${circuitName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

// ============================================================================
// EXPORTADOR ESQUEMA MULTIFILAR (MULTILÁMINA PRECISA CONEXIONES L/N/PE)
// ============================================================================

export function exportMultifilarPdf(
  nodes: AppNode[],
  edges: AppEdge[],
  circuitName = 'Circuito Eléctrico'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const topology = analyzeCircuitTopology(nodes, edges);

  const circuitsPerPage = 2; // Máximo 2 circuitos por página en multifilar para máxima claridad
  const totalPages = Math.max(1, Math.ceil(topology.circuits.length / circuitsPerPage));

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    drawPageTemplate(doc, 'MULTIFILAR', circuitName, page + 1, totalPages);

    const pageCircuits = topology.circuits.slice(page * circuitsPerPage, (page + 1) * circuitsPerPage);

    // 3 Buses de alimentación superiores alineados DENTRO de los márgenes
    const startX = 35;
    const endX = 265;
    const busL_Y = 22;
    const busN_Y = 28;
    const busPE_Y = 34;

    // Etiquetas a la izquierda DENTRO del plano (sin cortes de margen)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);

    doc.setTextColor(30, 41, 59);
    doc.text('L', startX - 8, busL_Y + 1.2);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.6);
    doc.line(startX, busL_Y, endX, busL_Y);
    doc.circle(startX, busL_Y, 0.8, 'FD');

    doc.setTextColor(2, 132, 199);
    doc.text('N', startX - 8, busN_Y + 1.2);
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.6);
    doc.line(startX, busN_Y, endX, busN_Y);
    doc.circle(startX, busN_Y, 0.8, 'FD');

    doc.setTextColor(22, 163, 74);
    doc.text('PE', startX - 10, busPE_Y + 1.2);
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.6);
    if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
    doc.line(startX, busPE_Y, endX, busPE_Y);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    doc.circle(startX, busPE_Y, 0.8, 'FD');

    // Barra de retorno Neutro inferior por lámina
    const bottomN_Y = 160;
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.4);
    doc.line(startX, bottomN_Y, endX, bottomN_Y);

    const colWidth = (endX - startX) / Math.max(1, pageCircuits.length);

    pageCircuits.forEach((circuit, cIdx) => {
      const colCenterX = startX + cIdx * colWidth + colWidth / 2;
      const pL = colCenterX - 4;
      const pN = colCenterX + 4;
      let currY = busPE_Y + 4;

      // Derivación exacta con puntos de nudo
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.4);
      doc.circle(pL, busL_Y, 0.8, 'FD');
      doc.line(pL, busL_Y, pL, currY);

      doc.setDrawColor(2, 132, 199);
      doc.circle(pN, busN_Y, 0.8, 'FD');
      doc.line(pN, busN_Y, pN, currY);

      // Bipolar PIA
      drawMultifilarPIASymbol(doc, colCenterX, currY, circuit.ratedAmps, circuit.name);
      currY += 10;

      // Salidas del PIA: Fase y Neutro descienden limpiamente
      doc.setDrawColor(30, 41, 59);
      doc.line(pL, currY, pL, currY + 6);

      doc.setDrawColor(2, 132, 199);
      doc.line(pN, currY, pN, bottomN_Y);
      doc.circle(pN, bottomN_Y, 0.8, 'FD');

      currY += 6;

      // Dibujar sub-ramas en columnas secundarias
      const numBranches = circuit.subBranches.length;
      const subColWidth = colWidth / Math.max(1, numBranches);

      circuit.subBranches.forEach((branch, bIdx) => {
        const branchCenterX = colCenterX - colWidth / 2 + (bIdx + 0.5) * subColWidth;
        const bPhaseX = branchCenterX - 6;
        const bNeutralX = branchCenterX + 6;
        let bY = currY + 6;

        // Llevar Fase desde pL hasta la rama
        doc.setDrawColor(30, 41, 59);
        doc.line(pL, currY + 2, bPhaseX, currY + 2);
        doc.circle(pL, currY + 2, 0.6, 'FD');
        doc.line(bPhaseX, currY + 2, bPhaseX, bY);

        if (branch.type === 'lighting_simple') {
          const sw = branch.switches[0];
          const lamp = branch.loads[0];

          // Interruptor simple: dos bornes y cuchilla
          doc.circle(bPhaseX, bY, 0.6);
          doc.circle(bPhaseX, bY + 8, 0.6);
          doc.line(bPhaseX, bY, bPhaseX + 3, bY + 6); // cuchilla abierta

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(15, 23, 42);
          doc.text(sw ? (sw.data as SwitchComponent).name : 'S1', bPhaseX + 5, bY + 4);

          // Vuelta de lámpara baja a la lámpara
          doc.line(bPhaseX, bY + 8, bPhaseX, bY + 16);
          bY += 16;

          // Lámpara
          drawMultifilarLampSymbol(doc, branchCenterX, bY + 3.5, lamp ? (lamp.data as LoadComponent).name : 'L1');
          doc.line(bPhaseX, bY + 3.5, branchCenterX - 3.5, bY + 3.5);

          // Retorno de Neutro a barra inferior
          doc.setDrawColor(2, 132, 199);
          doc.line(branchCenterX + 3.5, bY + 3.5, bNeutralX, bY + 3.5);
          doc.line(bNeutralX, bY + 3.5, bNeutralX, bottomN_Y);
          doc.circle(bNeutralX, bottomN_Y, 0.7, 'FD');
        } else if (branch.type === 'lighting_two_way' || branch.type === 'lighting_intermediate') {
          // Conmutada multifilar: dos conmutadores con 2 hilos viajeros horizontales L1 y L2 (exacto Imagen 4)
          const sw1 = branch.switches[0];
          const sw2 = branch.switches[branch.switches.length - 1];
          const lamp = branch.loads[0];

          const sw1X = branchCenterX - 10;
          const sw2X = branchCenterX + 10;

          // Fase entra al COM de SW1
          doc.line(bPhaseX, bY, sw1X - 3.5, bY);
          doc.circle(sw1X - 3.5, bY, 0.6); // Borne COM SW1

          // Bornes viajeros SW1
          doc.circle(sw1X + 3.5, bY - 3, 0.6); // L1
          doc.circle(sw1X + 3.5, bY + 3, 0.6); // L2
          doc.line(sw1X - 3.5, bY, sw1X + 2.5, bY - 3); // contacto a L1

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.text(sw1 ? (sw1.data as SwitchComponent).name : 'Q1', sw1X, bY - 6, { align: 'center' });

          // Bornes viajeros SW2
          doc.circle(sw2X - 3.5, bY - 3, 0.6); // L1
          doc.circle(sw2X - 3.5, bY + 3, 0.6); // L2
          doc.circle(sw2X + 3.5, bY, 0.6); // COM SW2
          doc.line(sw2X - 2.5, bY - 3, sw2X + 3.5, bY); // contacto desde L1

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.text(sw2 ? (sw2.data as SwitchComponent).name : 'Q2', sw2X, bY - 6, { align: 'center' });

          // Hilos viajeros L1 y L2 horizontales entre conmutadores
          doc.setDrawColor(100, 116, 139);
          doc.line(sw1X + 3.5, bY - 3, sw2X - 3.5, bY - 3);
          doc.line(sw1X + 3.5, bY + 3, sw2X - 3.5, bY + 3);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.text('L1', (sw1X + sw2X) / 2, bY - 4, { align: 'center' });
          doc.text('L2', (sw1X + sw2X) / 2, bY + 5, { align: 'center' });

          // Vuelta de lámpara desde COM de SW2 a la Lámpara
          doc.setDrawColor(139, 92, 246);
          doc.line(sw2X + 3.5, bY, branchCenterX, bY);
          doc.line(branchCenterX, bY, branchCenterX, bY + 14);
          bY += 14;

          drawMultifilarLampSymbol(doc, branchCenterX, bY + 3.5, lamp ? (lamp.data as LoadComponent).name : 'L1');

          // Retorno de Neutro
          doc.setDrawColor(2, 132, 199);
          doc.line(branchCenterX + 3.5, bY + 3.5, bNeutralX, bY + 3.5);
          doc.line(bNeutralX, bY + 3.5, bNeutralX, bottomN_Y);
          doc.circle(bNeutralX, bottomN_Y, 0.7, 'FD');
        } else if (branch.type === 'socket' || branch.type === 'power_socket') {
          // Toma de corriente multifilar (exacto Imagen 4)
          bY += 10;
          drawMultifilarSocketSymbol(doc, branchCenterX, bY, branch.name);

          // Fase a pin izquierdo
          doc.setDrawColor(30, 41, 59);
          doc.line(bPhaseX, bY + 0.8, branchCenterX - 1.8, bY + 0.8);

          // Neutro a pin derecho
          doc.setDrawColor(2, 132, 199);
          doc.line(branchCenterX + 1.8, bY + 0.8, bNeutralX, bY + 0.8);
          doc.line(bNeutralX, bY + 0.8, bNeutralX, bottomN_Y);
          doc.circle(bNeutralX, bottomN_Y, 0.7, 'FD');

          // Conexión Tierra PE (verde discontinua directa desde bus PE superior)
          doc.setDrawColor(22, 163, 74);
          if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
          doc.circle(branchCenterX, busPE_Y, 0.8, 'FD');
          doc.line(branchCenterX, busPE_Y, branchCenterX, bY - 4);
          if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
        } else if (branch.type === 'buzzer') {
          // Pulsador y timbre
          doc.circle(bPhaseX, bY, 0.6);
          doc.circle(bPhaseX, bY + 8, 0.6);
          doc.line(bPhaseX + 2, bY - 0.5, bPhaseX + 2, bY + 8.5);
          doc.line(bPhaseX + 2, bY + 4, bPhaseX + 4, bY + 4);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text('Pulsador', bPhaseX + 5, bY + 4);

          doc.line(bPhaseX, bY + 8, bPhaseX, bY + 16);
          bY += 16;

          // Cúpula timbre
          drawArc(doc, branchCenterX, bY + 4, 4, 0, Math.PI);
          doc.line(branchCenterX - 4, bY + 4, branchCenterX + 4, bY + 4);
          doc.line(bPhaseX, bY + 4, branchCenterX - 4, bY + 4);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text('Timbre', branchCenterX, bY + 9, { align: 'center' });

          doc.setDrawColor(2, 132, 199);
          doc.line(branchCenterX + 4, bY + 4, bNeutralX, bY + 4);
          doc.line(bNeutralX, bY + 4, bNeutralX, bottomN_Y);
          doc.circle(bNeutralX, bottomN_Y, 0.7, 'FD');
        }
      });
    });
  }

  const fileName = `Esquema_Multifilar_${circuitName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
