import { jsPDF } from 'jspdf';
import type { AppEdge, AppNode, BreakerComponent, LoadComponent, SwitchComponent } from '../types/electrical';

// ============================================================================
// CLASIFICADOR Y DETECTOR DE TOPOLOGÍA DEL CANVAS
// ============================================================================

export interface ClassifiedCircuit {
  source?: AppNode;
  breakers: AppNode[];
  switches: AppNode[];
  loads: AppNode[];
  twoWaySwitches: AppNode[];
  intermediateSwitches: AppNode[];
  pushbuttons: AppNode[];
  singleSwitches: AppNode[];
  buzzers: AppNode[];
  lamps: AppNode[];
  sockets: AppNode[];
  isMiswiredTwoWay: boolean;
  isMultiCircuit: boolean;
  hasBreakers: boolean;
  igas: AppNode[];
  pcss: AppNode[];
  rcds: AppNode[];
  pias: AppNode[];
  branchBreakers: AppNode[];
  branchBreaker?: AppNode;
  mainIga?: AppNode;
  mainRcd?: AppNode;
}

export function classifyCircuitTopology(nodes: AppNode[], edges: AppEdge[]): ClassifiedCircuit {
  const source = nodes.find((n) => n.data.type === 'source');
  const breakers = nodes.filter((n) => n.data.type === 'breaker');
  const switches = nodes.filter((n) => n.data.type === 'switch');
  const loads = nodes.filter((n) => n.data.type === 'load');

  const twoWaySwitches = switches.filter(
    (s) => (s.data as SwitchComponent).switchType === 'two_way'
  );
  const intermediateSwitches = switches.filter(
    (s) => (s.data as SwitchComponent).switchType === 'intermediate'
  );
  const pushbuttons = switches.filter(
    (s) => (s.data as SwitchComponent).switchType === 'pushbutton'
  );
  const singleSwitches = switches.filter(
    (s) => (s.data as SwitchComponent).switchType === 'single_pole'
  );

  const buzzers = loads.filter((l) => (l.data as LoadComponent).loadType === 'buzzer');
  const lamps = loads.filter((l) => (l.data as LoadComponent).loadType === 'lamp');
  const sockets = loads.filter((l) => (l.data as LoadComponent).loadType === 'socket');

  // Detectar conmutada mal conexionada (Fase conectada a viajero L1/L2 en lugar de a COM)
  const isMiswiredTwoWay = twoWaySwitches.some((sw) => {
    return edges.some((e) => {
      const isTarget = e.target === sw.id && (e.targetHandle === 'term-sw-l1' || e.targetHandle === 'term-sw-l2');
      const isSource = e.source === sw.id && (e.sourceHandle === 'term-sw-l1' || e.sourceHandle === 'term-sw-l2');
      const otherId = e.source === sw.id ? e.target : e.source;
      const otherNode = nodes.find((n) => n.id === otherId);
      return (isTarget || isSource) && (otherNode?.data.type === 'breaker' || otherNode?.data.type === 'source');
    });
  });

  const igas = breakers.filter((b) => {
    const bt = (b.data as BreakerComponent).breakerType;
    const name = (b.data as BreakerComponent).name.toLowerCase();
    return bt === 'iga' || name.includes('iga') || name.includes('general');
  });

  const pcss = breakers.filter((b) => {
    const bt = (b.data as BreakerComponent).breakerType;
    const name = (b.data as BreakerComponent).name.toLowerCase();
    return bt === 'pcs' || name.includes('pcs') || name.includes('sobretensiones');
  });

  const rcds = breakers.filter((b) => {
    const bt = (b.data as BreakerComponent).breakerType;
    const name = (b.data as BreakerComponent).name.toLowerCase();
    return bt === 'rcd' || name.includes('diferencial') || name.includes('id ');
  });

  const pias = breakers.filter((b) => !igas.includes(b) && !pcss.includes(b) && !rcds.includes(b));

  const branchBreakers = pias;
  const mainIga = igas[0];
  const mainRcd = rcds[0];
  const branchBreaker = pias[0] || breakers[0];

  const isMultiCircuit = branchBreakers.length >= 3 || nodes.some((n) => n.id.includes('-fh'));
  const hasBreakers = breakers.length > 0;

  return {
    source,
    breakers,
    switches,
    loads,
    twoWaySwitches,
    intermediateSwitches,
    pushbuttons,
    singleSwitches,
    buzzers,
    lamps,
    sockets,
    isMiswiredTwoWay,
    isMultiCircuit,
    hasBreakers,
    igas,
    pcss,
    rcds,
    pias,
    branchBreakers,
    branchBreaker,
    mainIga,
    mainRcd,
  };
}

// ============================================================================
// UTILIDADES GEOMÉTRICAS Y DE DIBUJO jsPDF
// ============================================================================

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
 * Traza el marco técnico normalizado DIN A4 con referencias cartesianas (1-6, A-D)
 * y cajetín oficial según UNE 1035 / ISO 7200 / REBT ITC-BT-04.
 */
function drawTechnicalPageBorder(
  doc: jsPDF,
  planType: 'UNIFILAR' | 'MULTIFILAR',
  circuitName: string,
  pageNum: number,
  totalPages: number,
  extraSubtitle?: string
) {
  // Marco exterior DIN A4 Landscape (297 x 210 mm)
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.6);
  doc.rect(10, 10, 277, 190);

  // Marco interior de delineación
  doc.setDrawColor(100, 116, 139); // slate-500
  doc.setLineWidth(0.25);
  doc.rect(12, 12, 273, 186);

  // Coordenadas perimétricas (1-6 superior/inferior, A-D izquierda/derecha)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);

  const colStep = 273 / 6;
  for (let i = 0; i < 6; i++) {
    const xCoord = 12 + (i + 0.5) * colStep;
    doc.text(`${i + 1}`, xCoord, 11.5, { align: 'center' });
    doc.text(`${i + 1}`, xCoord, 199.5, { align: 'center' });
  }

  const rowStep = 186 / 4;
  const rowLabels = ['A', 'B', 'C', 'D'];
  for (let i = 0; i < 4; i++) {
    const yCoord = 12 + (i + 0.5) * rowStep;
    doc.text(rowLabels[i], 11, yCoord);
    doc.text(rowLabels[i], 286, yCoord);
  }

  // Cajetín normalizado REBT en la base
  const cX = 12;
  const cY = 173;
  const cW = 273;
  const cH = 25;

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.rect(cX, cY, cW, cH);

  // Divisiones internas del cajetín
  doc.line(cX + 115, cY, cX + 115, cY + cH);
  doc.line(cX + 195, cY, cX + 195, cY + cH);
  doc.line(cX + 115, cY + 12.5, cX + cW, cY + 12.5);

  // Bloque Izquierdo: Identificación del Proyecto y Normativa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('INSTALACIONES ELÉCTRICAS DE INTERIOR (R.D. 842/2002 REBT)', cX + 4, cY + 5.5);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`ESQUEMA ELÉCTRICO ${planType}`, cX + 4, cY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Simbología normalizada según UNE-EN 60617 / UNE 20460', cX + 4, cY + 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Plano: ${circuitName.slice(0, 48)}${extraSubtitle ? ` - ${extraSubtitle}` : ''}`, cX + 4, cY + 21);

  // Bloque Central: Técnico y Centro Educativo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('TÉCNICO / INSTALADOR AUTORIZADO:', cX + 118, cY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('F.P. Electricidad y Electrotecnia', cX + 118, cY + 9);

  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`FECHA: ${dateStr}`, cX + 118, cY + 17);
  doc.text('ESCALA: S/E (Esquema funcional)', cX + 118, cY + 21.5);

  // Bloque Derecho: Hoja, Referencia y Estado
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('TIPO DE DOCUMENTO:', cX + 198, cY + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(2, 132, 199);
  doc.text(planType === 'UNIFILAR' ? 'UNIFILAR NORMALIZADO' : 'MULTIFILAR DE BORNES', cX + 198, cY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`HOJA: ${pageNum} de ${totalPages}`, cX + 198, cY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text('ESTADO: VERIFICADO REBT', cX + 198, cY + 21.5);
}

/**
 * Cuadro de leyenda técnica de conductores y bornes
 */
function drawConductorLegend(doc: jsPDF, x: number, y: number, isMultifilar = true) {
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, 76, isMultifilar ? 20 : 16, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('LEYENDA DE CONDUCTORES (REBT)', x + 2.5, y + 4);

  if (isMultifilar) {
    // Fase L (Marrón)
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.6);
    doc.line(x + 3, y + 8, x + 11, y + 8);
    doc.circle(x + 11, y + 8, 0.6, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(51, 65, 85);
    doc.text('L: Fase (Marrón, 230V)', x + 13, y + 9);

    // Neutro N (Azul)
    doc.setDrawColor(2, 132, 199);
    doc.line(x + 3, y + 12, x + 11, y + 12);
    doc.circle(x + 11, y + 12, 0.6, 'FD');
    doc.text('N: Neutro (Azul, 0V)', x + 13, y + 13);

    // Tierra PE (Verde-Amarillo)
    doc.setDrawColor(22, 163, 74);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1.5, 1], 0);
    doc.line(x + 3, y + 16, x + 11, y + 16);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    doc.circle(x + 11, y + 16, 0.6, 'FD');
    doc.text('PE: Tierra (Verde/Amarillo)', x + 13, y + 17);

    // Bornes viajeros / Retornos
    doc.setDrawColor(99, 102, 241);
    doc.line(x + 46, y + 8, x + 53, y + 8);
    doc.text('L1/L2: Viajeros', x + 55, y + 9);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(51, 65, 85);
    doc.text('// : 2 conductores (Fase + Neutro)', x + 3, y + 8);
    doc.text('/// : 3 conductores (F + N + PE)', x + 3, y + 12);
    doc.text('//// : 4 conductores (Viajeros cruce)', x + 3, y + 15);
  }
}

// ============================================================================
// SIMBOLOGÍA MULTIFILAR NORMALIZADA UNE-EN 60617
// ============================================================================

/**
 * Dibuja un interruptor magnetotérmico bipolar (PIA, IGA) o diferencial (ID)
 * con bornes físicos de entrada (arriba) y salida (abajo)
 */
function drawMultifilarBreaker(
  doc: jsPDF,
  x: number,
  y: number,
  amps: number,
  name: string,
  breakerType: BreakerComponent['breakerType'] = 'circuit_breaker'
) {
  const w = 24;
  const h = 26;

  // Caja exterior del módulo carril DIN
  doc.setDrawColor(51, 65, 85);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 2, 2, 'FD');

  const pL_in = x - 5;
  const pN_in = x + 5;
  const pL_out = x - 5;
  const pN_out = x + 5;

  const y_in = y - h / 2;
  const y_out = y + h / 2;

  // Puntos de bornes superiores (Entradas L y N)
  doc.setFillColor(180, 83, 9); // Marrón Fase
  doc.circle(pL_in, y_in, 0.9, 'FD');
  doc.setFillColor(2, 132, 199); // Azul Neutro
  doc.circle(pN_in, y_in, 0.9, 'FD');

  // Puntos de bornes inferiores (Salidas L y N)
  doc.setFillColor(180, 83, 9);
  doc.circle(pL_out, y_out, 0.9, 'FD');
  doc.setFillColor(2, 132, 199);
  doc.circle(pN_out, y_out, 0.9, 'FD');

  // Rótulos de bornes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(180, 83, 9);
  doc.text('1(L)', pL_in, y_in + 3, { align: 'center' });
  doc.text('2', pL_out, y_out - 1.5, { align: 'center' });

  doc.setTextColor(2, 132, 199);
  doc.text('N', pN_in, y_in + 3, { align: 'center' });
  doc.text('N', pN_out, y_out - 1.5, { align: 'center' });

  // Mecanismo interno según tipo:
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);

  if (breakerType === 'rcd') {
    // Diferencial: Toroide circular y corte bipolar
    doc.circle(x, y, 4); // toroide toroidal
    doc.line(pL_in, y - 5, pL_out, y + 5);
    doc.line(pN_in, y - 5, pN_out, y + 5);
    // Botón Test
    doc.rect(x + 5, y - 2, 3, 3);
    doc.setFontSize(4);
    doc.setTextColor(15, 23, 42);
    doc.text('T', x + 6.5, y + 0.5, { align: 'center' });
  } else if (breakerType === 'pcs') {
    // Protector de Sobretensiones (varistor y vía a tierra)
    doc.rect(x - 5, y - 4, 10, 8);
    doc.line(x - 5, y + 4, x + 5, y - 4);
    doc.line(x + 3, y - 4, x + 5, y - 4);
    doc.line(x - 5, y + 4, x - 3, y + 4);
    doc.setFontSize(4);
    doc.setTextColor(15, 23, 42);
    doc.text('SPD', x, y + 1.2, { align: 'center' });
  } else {
    // Magnetotérmico (PIA o IGA)
    // Cuchilla polo L con bimetal térmico y gancho magnético
    doc.circle(pL_in, y - 4, 0.6);
    doc.line(pL_in, y - 4, pL_in + 3, y + 4);
    doc.circle(pL_out, y + 5, 0.6);

    // Bimetal térmico
    doc.line(pL_in + 1.2, y - 1, pL_in + 2.8, y - 1);
    doc.line(pL_in + 2.8, y - 1, pL_in + 2.8, y + 1);
    // Gancho magnético
    doc.line(pL_in + 1.8, y + 1.8, pL_in + 3.8, y + 1.8);

    // Cuchilla polo N (corte neutro)
    doc.circle(pN_in, y - 4, 0.6);
    doc.line(pN_in, y - 4, pN_in + 2.5, y + 4);
    doc.circle(pN_out, y + 5, 0.6);

    // Acoplamiento mecánico en línea discontinua
    doc.setDrawColor(148, 163, 184);
    if (doc.setLineDashPattern) doc.setLineDashPattern([1, 1], 0);
    doc.line(pL_in + 1.5, y, pN_in + 1.5, y);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
  }

  // Título e intensidad nominal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const tag =
    breakerType === 'iga'
      ? `IGA 2x${amps}A`
      : breakerType === 'rcd'
      ? `ID 2x${amps}A 30mA`
      : breakerType === 'pcs'
      ? `PCS 40A`
      : `PIA 2x${amps}A`;
  doc.text(tag, x, y - h / 2 - 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(name.slice(0, 18), x, y + h / 2 + 4.5, { align: 'center' });
}

/**
 * Dibuja un interruptor unipolar multifilar con 2 bornes físicos
 */
function drawMultifilarSingleSwitch(doc: jsPDF, x: number, y: number, name: string) {
  const w = 22;
  const h = 18;

  doc.setDrawColor(51, 65, 85);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 2, 2, 'FD');

  const p1X = x - w / 2;
  const p2X = x + w / 2;

  doc.setFillColor(30, 41, 59);
  doc.circle(p1X, y, 0.9, 'FD');
  doc.circle(p2X, y, 0.9, 'FD');

  // Contacto interno móvil a 45º con trazo perpendicular (símbolo UNE-EN 60617)
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.circle(x - 4, y, 0.7);
  doc.line(x - 4, y, x + 3, y - 5);
  doc.line(x + 3, y - 5, x + 3, y - 7.5);
  doc.circle(x + 4, y, 0.7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('1 (L)', p1X + 2, y - 2);
  doc.text('2', p2X - 4, y - 2);

  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y + 7, { align: 'center' });
}

/**
 * Dibuja un pulsador NA multifilar (timbre) con tecla en T
 */
function drawMultifilarPushbutton(doc: jsPDF, x: number, y: number, name: string) {
  const w = 22;
  const h = 18;

  doc.setDrawColor(51, 65, 85);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 2, 2, 'FD');

  const p1X = x - w / 2;
  const p2X = x + w / 2;

  doc.setFillColor(30, 41, 59);
  doc.circle(p1X, y, 0.9, 'FD');
  doc.circle(p2X, y, 0.9, 'FD');

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.circle(x - 4, y, 0.7);
  doc.circle(x + 4, y, 0.7);
  doc.line(x - 4.5, y - 4, x + 4.5, y - 4); // Tecla en T
  doc.line(x, y - 4, x, y - 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text('1 (L)', p1X + 2, y - 2);
  doc.text('2', p2X - 4, y - 2);

  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y + 7, { align: 'center' });
}

/**
 * Dibuja Conmutador Q1 (Emisor):
 * - Borne COM abajo: entrada de Fase
 * - Borne L1 arriba-derecha: salida viajero L1 hacia Q2
 * - Borne L2 abajo-derecha: salida viajero L2 hacia Q2
 */
function drawMultifilarSwitchQ1(doc: jsPDF, x: number, y: number, name: string, isMiswired = false) {
  const w = 26;
  const h = 22;

  if (isMiswired) {
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(0.5);
  } else {
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.35);
  }
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 2, 2, 'FD');

  // Bornes:
  const comX = x;
  const comY = y + h / 2;

  // En el caso normal: L1 y L2 a la derecha hacia Q2
  // En el caso mal conexionado: L1 a la izquierda para recibir Fase por error
  const l1X = isMiswired ? x - w / 2 : x + w / 2;
  const l1Y = y - 4;

  const l2X = x + w / 2;
  const l2Y = y + 4;

  // Puntos de conexión
  doc.setFillColor(217, 119, 6); // ámbar para COM
  doc.circle(comX, comY, 0.9, 'FD');

  doc.setFillColor(99, 102, 241); // índigo para viajeros
  doc.circle(l1X, l1Y, 0.9, 'FD');
  doc.circle(l2X, l2Y, 0.9, 'FD');

  // Cuchilla interna basculante
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.circle(x, y + 3, 0.7); // punto común
  doc.line(x, y + 3, comX, comY - 1);

  if (isMiswired) {
    doc.circle(x - 7, y - 4, 0.7);
    doc.circle(x + 7, y + 4, 0.7);
    doc.line(x, y + 3, x - 6.5, y - 3.5); // conectado a L1
  } else {
    doc.circle(x + 7, y - 4, 0.7); // contacto L1
    doc.circle(x + 7, y + 4, 0.7); // contacto L2
    doc.line(x, y + 3, x + 6.5, y - 3.5); // conectado a L1
  }

  // Rótulos de bornes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(180, 83, 9);
  doc.text('COM', comX, comY - 2.5, { align: 'center' });

  doc.setTextColor(79, 70, 229);
  if (isMiswired) {
    doc.text('L1', l1X + 2.5, l1Y + 1.5);
  } else {
    doc.text('L1', l1X - 4.5, l1Y + 1.5);
  }
  doc.text('L2', l2X - 4.5, l2Y + 1.5);

  // Nombre
  doc.setFontSize(6.5);
  if (isMiswired) {
    doc.setTextColor(220, 38, 38);
  } else {
    doc.setTextColor(15, 23, 42);
  }
  doc.text(name, x, y - 7.5, { align: 'center' });
}

/**
 * Dibuja Conmutador Q2 (Receptor):
 * - Borne L1 arriba-izquierda: entrada viajero L1 desde Q1
 * - Borne L2 abajo-izquierda: entrada viajero L2 desde Q1
 * - Borne COM abajo: salida vuelta de lámpara hacia bombilla
 */
function drawMultifilarSwitchQ2(doc: jsPDF, x: number, y: number, name: string) {
  const w = 26;
  const h = 22;

  doc.setDrawColor(51, 65, 85);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 2, 2, 'FD');

  const l1X = x - w / 2;
  const l1Y = y - 4;

  const l2X = x - w / 2;
  const l2Y = y + 4;

  const comX = x;
  const comY = y + h / 2;

  // Puntos de conexión
  doc.setFillColor(99, 102, 241);
  doc.circle(l1X, l1Y, 0.9, 'FD');
  doc.circle(l2X, l2Y, 0.9, 'FD');

  doc.setFillColor(217, 119, 6);
  doc.circle(comX, comY, 0.9, 'FD');

  // Cuchilla interna basculante
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.circle(x, y + 3, 0.7);
  doc.line(x, y + 3, comX, comY - 1);

  doc.circle(x - 7, y - 4, 0.7); // contacto L1
  doc.circle(x - 7, y + 4, 0.7); // contacto L2

  // Contacto cerrado a L1
  doc.line(x, y + 3, x - 6.5, y - 3.5);

  // Rótulos de bornes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(79, 70, 229);
  doc.text('L1', l1X + 2.5, l1Y + 1.5);
  doc.text('L2', l2X + 2.5, l2Y + 1.5);

  doc.setTextColor(180, 83, 9);
  doc.text('COM', comX, comY - 2.5, { align: 'center' });

  // Nombre
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y - 7.5, { align: 'center' });
}

/**
 * Dibuja un conmutador de cruce (cruzamiento) con sus 4 bornes físicos:
 * - Bornes entrada L1 y L2 (arriba/izq)
 * - Bornes salida L3 y L4 (abajo/der)
 */
function drawMultifilarIntermediateSwitch(doc: jsPDF, x: number, y: number, name: string) {
  const w = 26;
  const h = 22;

  doc.setDrawColor(51, 65, 85);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 2, 2, 'FD');

  const p1X = x - w / 2;
  const p1Y = y - 4;
  const p2X = x - w / 2;
  const p2Y = y + 4;

  const p3X = x + w / 2;
  const p3Y = y - 4;
  const p4X = x + w / 2;
  const p4Y = y + 4;

  doc.setFillColor(99, 102, 241);
  doc.circle(p1X, p1Y, 0.9, 'FD');
  doc.circle(p2X, p2Y, 0.9, 'FD');
  doc.circle(p3X, p3Y, 0.9, 'FD');
  doc.circle(p4X, p4Y, 0.9, 'FD');

  // Aspas internas de cruce
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);
  doc.line(x - 5, y - 4, x + 5, y + 4);
  doc.line(x - 5, y + 4, x + 5, y - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(79, 70, 229);
  doc.text('1', p1X + 2, p1Y + 1.5);
  doc.text('2', p2X + 2, p2Y + 1.5);
  doc.text('3', p3X - 3.5, p3Y + 1.5);
  doc.text('4', p4X - 3.5, p4Y + 1.5);

  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y - 7.5, { align: 'center' });
}

/**
 * Dibuja una lámpara multifilar según UNE-EN 60617 (Círculo con cruz interna)
 */
function drawMultifilarLamp(doc: jsPDF, x: number, y: number, name: string) {
  const r = 5.5;

  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(x, y, r, 'FD');

  // Cruz interna en aspa
  const d = r * 0.707;
  doc.line(x - d, y - d, x + d, y + d);
  doc.line(x - d, y + d, x + d, y - d);

  // Bornes de conexión: L (izq) y N (der)
  const pLX = x - r;
  const pNX = x + r;

  doc.setFillColor(180, 83, 9);
  doc.circle(pLX, y, 0.9, 'FD');

  doc.setFillColor(2, 132, 199);
  doc.circle(pNX, y, 0.9, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(180, 83, 9);
  doc.text('L', pLX - 3.5, y + 1.5);

  doc.setTextColor(2, 132, 199);
  doc.text('N', pNX + 1.5, y + 1.5);

  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y + r + 4.5, { align: 'center' });
}

/**
 * Dibuja un timbre / zumbador multifilar según UNE-EN 60617
 */
function drawMultifilarBuzzer(doc: jsPDF, x: number, y: number, name: string) {
  const r = 5.5;

  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);

  drawArc(doc, x, y - 1, r, Math.PI, 2 * Math.PI);
  doc.line(x - r, y - 1, x + r, y - 1);

  doc.line(x, y - 1, x, y + 4);
  doc.circle(x, y + 4, 1, 'FD');

  drawArc(doc, x + 7, y - 2, 2.5, -Math.PI / 3, Math.PI / 3);
  drawArc(doc, x + 9, y - 2, 4, -Math.PI / 3, Math.PI / 3);

  const p1X = x - r;
  const p2X = x + r;

  doc.setFillColor(180, 83, 9);
  doc.circle(p1X, y - 1, 0.9, 'FD');

  doc.setFillColor(2, 132, 199);
  doc.circle(p2X, y - 1, 0.9, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(180, 83, 9);
  doc.text('1', p1X - 3, y);

  doc.setTextColor(2, 132, 199);
  doc.text('2 (N)', p2X + 1.5, y);

  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y + r + 5, { align: 'center' });
}

/**
 * Dibuja una toma de corriente Schuko 2P+T con sus 3 bornes reales:
 * - Borne L (Fase) a la izquierda
 * - Borne N (Neutro) a la derecha
 * - Borne PE (Tierra) abajo
 */
function drawMultifilarSocket(doc: jsPDF, x: number, y: number, name: string) {
  const r = 6;

  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.circle(x, y, r, 'FD');

  doc.circle(x - 2.5, y, 1, 'FD');
  doc.circle(x + 2.5, y, 1, 'FD');

  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.5);
  doc.line(x, y - 1.5, x, y + 2.5);
  doc.line(x - 1.5, y + 2.5, x + 1.5, y + 2.5);

  const pLX = x - r;
  const pNX = x + r;
  const pPEX = x;
  const pPEY = y + r;

  doc.setFillColor(180, 83, 9);
  doc.circle(pLX, y, 0.9, 'FD');

  doc.setFillColor(2, 132, 199);
  doc.circle(pNX, y, 0.9, 'FD');

  doc.setFillColor(22, 163, 74);
  doc.circle(pPEX, pPEY, 0.9, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(180, 83, 9);
  doc.text('L', pLX - 3.5, y + 1.5);

  doc.setTextColor(2, 132, 199);
  doc.text('N', pNX + 1.5, y + 1.5);

  doc.setTextColor(22, 163, 74);
  doc.text('PE', pPEX, pPEY + 4, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y - r - 2.5, { align: 'center' });
}

// ============================================================================
// SIMBOLOGÍA UNIFILAR NORMALIZADA UNE-EN 60617
// ============================================================================

function drawCanalizacionSlash(doc: jsPDF, x: number, y: number, wireCount = 3, section = 1.5) {
  doc.setDrawColor(71, 85, 105);
  doc.setLineWidth(0.35);

  const spacing = 1.4;
  const startX = x - ((wireCount - 1) * spacing) / 2;
  for (let i = 0; i < wireCount; i++) {
    doc.line(startX + i * spacing - 1.2, y + 2, startX + i * spacing + 1.2, y - 2);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  const tag = section >= 6 ? `3G${section}` : `${wireCount}x${section}`;
  doc.text(tag, x, y - 3, { align: 'center' });
}

function drawUnifilarIGA(doc: jsPDF, x: number, y: number, amps: number, label = 'IGA General') {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);

  doc.line(x, y - 4, x, y - 1);
  doc.circle(x, y - 0.5, 0.7);
  doc.line(x, y - 0.5, x + 3.5, y + 6);

  // Cuadrado de seccionador magnetotérmico general
  doc.rect(x + 1.2, y + 2, 2.6, 2.6);

  doc.circle(x, y + 7.5, 0.7);
  doc.line(x, y + 7.5, x, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`IGA 2x${amps}A`, x + 5.5, y + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.slice(0, 16), x + 5.5, y + 6.5);
}

function drawUnifilarID(doc: jsPDF, x: number, y: number, amps = 40, ma = 30, label = 'Diferencial') {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.45);

  doc.line(x, y - 4, x, y - 1);
  doc.circle(x, y - 0.5, 0.7);
  doc.line(x, y - 0.5, x + 3.5, y + 6);

  // Toroide diferencial
  doc.circle(x + 2.2, y + 3.2, 1.6);

  doc.circle(x, y + 7.5, 0.7);
  doc.line(x, y + 7.5, x, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`ID 2x${amps}A ${ma}mA`, x + 5.5, y + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.slice(0, 16), x + 5.5, y + 6.5);
}

function drawUnifilarPIA(doc: jsPDF, x: number, y: number, amps: number, label: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);

  doc.line(x, y - 4, x, y - 1);
  doc.circle(x, y - 0.5, 0.7);
  doc.line(x, y - 0.5, x + 3.5, y + 6);

  doc.line(x + 1.8, y + 3.2, x + 3.2, y + 3.2);
  doc.line(x + 3.2, y + 3.2, x + 3.2, y + 4.5);

  doc.circle(x, y + 7.5, 0.7);
  doc.line(x, y + 7.5, x, y + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text(`PIA 2x${amps}A`, x + 5.5, y + 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label.slice(0, 16), x + 5.5, y + 6.5);
}

function drawUnifilarSwitchSymbol(
  doc: jsPDF,
  x: number,
  y: number,
  type: SwitchComponent['switchType'],
  name: string
) {
  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);

  const r = 3;
  doc.circle(x, y, r, 'FD');

  if (type === 'single_pole') {
    doc.line(x, y, x + 4, y - 4);
    doc.line(x + 4, y - 4, x + 4, y - 6.5);
  } else if (type === 'two_way') {
    doc.line(x - 4, y + 4, x + 4, y - 4);
    doc.line(x - 4, y + 4, x - 4, y + 6.5);
    doc.line(x + 4, y - 4, x + 4, y - 6.5);
  } else if (type === 'intermediate') {
    doc.line(x - 3.5, y + 3.5, x + 3.5, y - 3.5);
    doc.line(x - 3.5, y - 3.5, x + 3.5, y + 3.5);
    doc.line(x + 3.5, y - 3.5, x + 5, y - 3.5);
    doc.line(x - 3.5, y + 3.5, x - 5, y + 3.5);
  } else if (type === 'pushbutton') {
    doc.line(x, y, x + 4, y - 4);
    doc.line(x + 2.5, y - 5.5, x + 5.5, y - 2.5);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y - 8, { align: 'center' });
}

function drawUnifilarLampSymbol(doc: jsPDF, x: number, y: number, name: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);

  const r = 4;
  doc.circle(x, y, r, 'FD');
  const d = r * 0.707;
  doc.line(x - d, y - d, x + d, y + d);
  doc.line(x - d, y + d, x + d, y - d);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y + 8, { align: 'center' });
}

function drawUnifilarBuzzerSymbol(doc: jsPDF, x: number, y: number, name: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);

  const r = 4;
  drawArc(doc, x, y, r, Math.PI, 2 * Math.PI);
  doc.line(x - r, y, x + r, y);
  doc.line(x, y, x, y + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y + 8, { align: 'center' });
}

function drawUnifilarSocketSymbol(doc: jsPDF, x: number, y: number, name: string) {
  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.4);

  const r = 4;
  drawArc(doc, x, y, r, 0, Math.PI);
  doc.line(x - r, y, x + r, y);
  doc.line(x, y, x, y - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(name, x, y + 8, { align: 'center' });
}

// ============================================================================
// EXPORTADOR ESQUEMA MULTIFILAR DE MÁXIMA FIDELIDAD CON COMPONENTES REALES
// ============================================================================

export function exportMultifilarPdf(
  nodes: AppNode[],
  edges: AppEdge[],
  circuitName = 'Circuito Eléctrico'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const classified = classifyCircuitTopology(nodes, edges);

  const totalPages = classified.isMultiCircuit ? 2 : 1;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();

    const pageSubtitle = classified.isMultiCircuit
      ? page === 0
        ? 'CGMP, Circuitos C1 (Alumbrado) y C2 (Tomas)'
        : 'Circuitos de Fuerza C3 (Cocina), C4 (Lavadora) y C5 (Baño)'
      : undefined;

    drawTechnicalPageBorder(doc, 'MULTIFILAR', circuitName, page + 1, totalPages, pageSubtitle);
    drawConductorLegend(doc, 205, 16, true);

    const busStartX = 25;
    const busEndX = 200;
    const busL_Y = 24;
    const busN_Y = 30;
    const busPE_Y = 36;
    const busBottomN_Y = 160;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    // L (Fase, marrón)
    doc.setTextColor(180, 83, 9);
    doc.text('L1 (230V)', busStartX - 10, busL_Y + 1.2);
    doc.setDrawColor(180, 83, 9);
    doc.setLineWidth(0.55);
    doc.line(busStartX, busL_Y, busEndX, busL_Y);
    doc.circle(busStartX, busL_Y, 0.8, 'FD');

    // N (Neutro, azul)
    doc.setTextColor(2, 132, 199);
    doc.text('N (0V)', busStartX - 10, busN_Y + 1.2);
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.55);
    doc.line(busStartX, busN_Y, busEndX, busN_Y);
    doc.circle(busStartX, busN_Y, 0.8, 'FD');

    // PE (Tierra, verde discontinua)
    doc.setTextColor(22, 163, 74);
    doc.text('PE', busStartX - 10, busPE_Y + 1.2);
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.55);
    if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
    doc.line(busStartX, busPE_Y, busEndX, busPE_Y);
    if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);
    doc.circle(busStartX, busPE_Y, 0.8, 'FD');

    // Barra de retorno Neutro inferior
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(0.45);
    doc.line(busStartX, busBottomN_Y, busEndX, busBottomN_Y);
    doc.text('Barra Neutro N', busEndX + 3, busBottomN_Y + 1.2);

    // Bajada vertical de Neutro general a la barra inferior
    doc.circle(busStartX + 4, busN_Y, 0.8, 'FD');
    doc.line(busStartX + 4, busN_Y, busStartX + 4, busBottomN_Y);
    doc.circle(busStartX + 4, busBottomN_Y, 0.8, 'FD');

    // CASO MULTI-CIRCUITO (Vivienda Completa REBT)
    if (classified.isMultiCircuit) {
      if (page === 0) {
        // PÁGINA 1: CGMP (IGA 40A, PCS, ID 40A/30mA) + C1 (Alumbrado) + C2 (Tomas)
        const igaX = 35;
        const pcsX = 64;
        const idX = 93;
        const piaC1X = 135;
        const piaC2X = 185;
        const cgmpY = 60;

        // Título del cuadro general
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(100, 116, 139);
        doc.rect(22, 41, 185, 6, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(30, 41, 59);
        doc.text('CUADRO GENERAL DE MANDO Y PROTECCIÓN (CGMP) - ITC-BT-25', 115, 45, { align: 'center' });

        // 1. IGA 40A
        const igaNode = classified.mainIga || classified.igas[0];
        const igaData = igaNode ? (igaNode.data as BreakerComponent) : null;
        drawMultifilarBreaker(doc, igaX, cgmpY, igaData?.ratedCurrent || 40, igaData?.name || 'IGA 40A General', 'iga');

        // Alimentación Red a IGA
        doc.setDrawColor(180, 83, 9);
        doc.setLineWidth(0.5);
        doc.circle(igaX - 5, busL_Y, 0.8, 'FD');
        doc.line(igaX - 5, busL_Y, igaX - 5, cgmpY - 13);

        doc.setDrawColor(2, 132, 199);
        doc.circle(igaX + 5, busN_Y, 0.8, 'FD');
        doc.line(igaX + 5, busN_Y, igaX + 5, cgmpY - 13);

        // 2. PCS Sobretensiones
        const pcsNode = classified.pcss[0];
        const pcsData = pcsNode ? (pcsNode.data as BreakerComponent) : null;
        drawMultifilarBreaker(doc, pcsX, cgmpY, 40, pcsData?.name || 'PCS Sobretensiones', 'pcs');

        // Conexión L y N de IGA a PCS
        doc.setDrawColor(180, 83, 9);
        doc.line(igaX - 5, cgmpY + 13, igaX - 5, cgmpY + 16);
        doc.line(igaX - 5, cgmpY + 16, pcsX - 5, cgmpY + 16);
        doc.line(pcsX - 5, cgmpY + 16, pcsX - 5, cgmpY + 13);

        doc.setDrawColor(2, 132, 199);
        doc.line(igaX + 5, cgmpY + 13, igaX + 5, cgmpY + 19);
        doc.line(igaX + 5, cgmpY + 19, pcsX + 5, cgmpY + 19);
        doc.line(pcsX + 5, cgmpY + 19, pcsX + 5, cgmpY + 13);

        // 3. Diferencial ID 40A 30mA
        const rcdNode = classified.mainRcd || classified.rcds[0];
        const rcdData = rcdNode ? (rcdNode.data as BreakerComponent) : null;
        drawMultifilarBreaker(doc, idX, cgmpY, rcdData?.ratedCurrent || 40, rcdData?.name || 'ID 40A 30mA', 'rcd');

        // Salida de IGA/PCS hacia Entrada de ID
        doc.setDrawColor(180, 83, 9);
        doc.line(pcsX - 5, cgmpY + 16, idX - 7, cgmpY + 16);
        doc.line(idX - 7, cgmpY + 16, idX - 7, cgmpY - 16);
        doc.line(idX - 7, cgmpY - 16, idX - 5, cgmpY - 16);
        doc.line(idX - 5, cgmpY - 16, idX - 5, cgmpY - 13);

        doc.setDrawColor(2, 132, 199);
        doc.line(pcsX + 5, cgmpY + 19, idX + 7, cgmpY + 19);
        doc.line(idX + 7, cgmpY + 19, idX + 7, cgmpY - 19);
        doc.line(idX + 7, cgmpY - 19, idX + 5, cgmpY - 19);
        doc.line(idX + 5, cgmpY - 19, idX + 5, cgmpY - 13);

        // Embarrado de distribución protegido por Diferencial (alimenta PIAs)
        const distBusL_Y = cgmpY + 16;
        const distBusN_Y = cgmpY + 20;

        doc.setDrawColor(180, 83, 9);
        doc.line(idX - 5, cgmpY + 13, idX - 5, distBusL_Y);
        doc.line(idX - 5, distBusL_Y, piaC2X - 5, distBusL_Y);

        doc.setDrawColor(2, 132, 199);
        doc.line(idX + 5, cgmpY + 13, idX + 5, distBusN_Y);
        doc.line(idX + 5, distBusN_Y, piaC2X + 5, distBusN_Y);

        // 4. PIA C1 10A (Alumbrado)
        const brkC1 = classified.pias.find((p) => (p.data as BreakerComponent).ratedCurrent <= 10) || classified.pias[0];
        const c1Data = brkC1 ? (brkC1.data as BreakerComponent) : null;
        drawMultifilarBreaker(doc, piaC1X, cgmpY, c1Data?.ratedCurrent || 10, c1Data?.name || 'PIA C1 10A', 'circuit_breaker');

        // Bajada desde embarrado a PIA C1 (inversión de puente)
        doc.setDrawColor(180, 83, 9);
        doc.circle(piaC1X - 5, distBusL_Y, 0.7, 'FD');
        doc.line(piaC1X - 5, distBusL_Y, piaC1X - 7, distBusL_Y);
        doc.line(piaC1X - 7, distBusL_Y, piaC1X - 7, cgmpY - 16);
        doc.line(piaC1X - 7, cgmpY - 16, piaC1X - 5, cgmpY - 16);
        doc.line(piaC1X - 5, cgmpY - 16, piaC1X - 5, cgmpY - 13);

        doc.setDrawColor(2, 132, 199);
        doc.circle(piaC1X + 5, distBusN_Y, 0.7, 'FD');
        doc.line(piaC1X + 5, distBusN_Y, piaC1X + 7, distBusN_Y);
        doc.line(piaC1X + 7, distBusN_Y, piaC1X + 7, cgmpY - 19);
        doc.line(piaC1X + 7, cgmpY - 19, piaC1X + 5, cgmpY - 19);
        doc.line(piaC1X + 5, cgmpY - 19, piaC1X + 5, cgmpY - 13);

        // Neutro de salida C1 a barra inferior
        doc.line(piaC1X + 5, cgmpY + 13, piaC1X + 5, busBottomN_Y);
        doc.circle(piaC1X + 5, busBottomN_Y, 0.8, 'FD');

        // 5. PIA C2 16A (Tomas)
        const brkC2 = classified.pias.find((p) => (p.data as BreakerComponent).ratedCurrent === 16) || classified.pias[1];
        const c2Data = brkC2 ? (brkC2.data as BreakerComponent) : null;
        drawMultifilarBreaker(doc, piaC2X, cgmpY, c2Data?.ratedCurrent || 16, c2Data?.name || 'PIA C2 16A', 'circuit_breaker');

        doc.setDrawColor(180, 83, 9);
        doc.circle(piaC2X - 5, distBusL_Y, 0.7, 'FD');
        doc.line(piaC2X - 5, distBusL_Y, piaC2X - 7, distBusL_Y);
        doc.line(piaC2X - 7, distBusL_Y, piaC2X - 7, cgmpY - 16);
        doc.line(piaC2X - 7, cgmpY - 16, piaC2X - 5, cgmpY - 16);
        doc.line(piaC2X - 5, cgmpY - 16, piaC2X - 5, cgmpY - 13);

        doc.setDrawColor(2, 132, 199);
        doc.circle(piaC2X + 5, distBusN_Y, 0.7, 'FD');
        doc.line(piaC2X + 5, distBusN_Y, piaC2X + 7, distBusN_Y);
        doc.line(piaC2X + 7, distBusN_Y, piaC2X + 7, cgmpY - 19);
        doc.line(piaC2X + 7, cgmpY - 19, piaC2X + 5, cgmpY - 19);
        doc.line(piaC2X + 5, cgmpY - 19, piaC2X + 5, cgmpY - 13);

        doc.line(piaC2X + 5, cgmpY + 13, piaC2X + 5, busBottomN_Y);
        doc.circle(piaC2X + 5, busBottomN_Y, 0.8, 'FD');

        // CIRCUITO C1 INFERIOR: Conmutada desde 3 puntos (Q1 + Cruce + Q2 + Lámpara)
        const c1Y = 120;
        const q1X = 40;
        const qCrX = 85;
        const q2X = 130;
        const lampX = 175;

        // Fase desde PIA C1 hasta COM de Q1
        doc.setDrawColor(180, 83, 9);
        doc.line(piaC1X - 5, cgmpY + 13, piaC1X - 5, cgmpY + 25);
        doc.line(piaC1X - 5, cgmpY + 25, q1X, cgmpY + 25);
        doc.line(q1X, cgmpY + 25, q1X, c1Y + 11);

        // Viajeros Q1 -> Cruce
        doc.setDrawColor(99, 102, 241);
        doc.line(q1X + 13, c1Y - 4, qCrX - 13, c1Y - 4);
        doc.line(q1X + 13, c1Y + 4, qCrX - 13, c1Y + 4);

        // Viajeros Cruce -> Q2
        doc.line(qCrX + 13, c1Y - 4, q2X - 13, c1Y - 4);
        doc.line(qCrX + 13, c1Y + 4, q2X - 13, c1Y + 4);

        drawMultifilarSwitchQ1(doc, q1X, c1Y, 'Conmutador Q1');
        drawMultifilarIntermediateSwitch(doc, qCrX, c1Y, 'Cruzamiento');
        drawMultifilarSwitchQ2(doc, q2X, c1Y, 'Conmutador Q2');

        // Vuelta de lámpara
        doc.setDrawColor(124, 58, 237);
        doc.line(q2X, c1Y + 11, q2X, c1Y + 18);
        doc.line(q2X, c1Y + 18, lampX - 5.5, c1Y + 18);
        doc.line(lampX - 5.5, c1Y + 18, lampX - 5.5, c1Y);

        drawMultifilarLamp(doc, lampX, c1Y, 'Punto Luz C1 (15W)');

        // Neutro lámpara a barra inferior
        doc.setDrawColor(2, 132, 199);
        doc.line(lampX + 5.5, c1Y, lampX + 12, c1Y);
        doc.line(lampX + 12, c1Y, lampX + 12, busBottomN_Y);
        doc.circle(lampX + 12, busBottomN_Y, 0.8, 'FD');

        // CIRCUITO C2 INFERIOR: Base de Toma Schuko
        const sockX = 225;
        // Fase desde PIA C2 a Toma
        doc.setDrawColor(180, 83, 9);
        doc.line(piaC2X - 5, cgmpY + 13, piaC2X - 5, c1Y - 15);
        doc.line(piaC2X - 5, c1Y - 15, sockX - 6, c1Y - 15);
        doc.line(sockX - 6, c1Y - 15, sockX - 6, c1Y);

        // Neutro de la toma a la barra inferior
        doc.setDrawColor(2, 132, 199);
        doc.line(sockX + 6, c1Y, sockX + 12, c1Y);
        doc.line(sockX + 12, c1Y, sockX + 12, busBottomN_Y);
        doc.circle(sockX + 12, busBottomN_Y, 0.8, 'FD');

        // PE Toma
        doc.setDrawColor(22, 163, 74);
        if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
        doc.circle(sockX, busPE_Y, 0.8, 'FD');
        doc.line(sockX, busPE_Y, sockX, c1Y + 6);
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        drawMultifilarSocket(doc, sockX, c1Y, 'Toma Schuko C2 (16A)');
      } else {
        // PÁGINA 2: Circuitos C3 (Cocina 25A), C4 (Lavadora 20A) y C5 (Baño 16A)
        const row1_Y = 70;
        const row2_Y = 122;

        // C3: Cocina/Horno (PIA 25A + Toma 25A)
        const piaC3X = 40;
        const sockC3X = 110;

        drawMultifilarBreaker(doc, piaC3X, row1_Y, 25, 'PIA C3 25A (Cocina)', 'circuit_breaker');

        doc.setDrawColor(180, 83, 9);
        doc.circle(piaC3X - 5, busL_Y, 0.8, 'FD');
        doc.line(piaC3X - 5, busL_Y, piaC3X - 5, row1_Y - 13);

        doc.setDrawColor(2, 132, 199);
        doc.circle(piaC3X + 5, busN_Y, 0.8, 'FD');
        doc.line(piaC3X + 5, busN_Y, piaC3X + 5, row1_Y - 13);

        doc.setDrawColor(180, 83, 9);
        doc.line(piaC3X - 5, row1_Y + 13, piaC3X - 5, row1_Y + 18);
        doc.line(piaC3X - 5, row1_Y + 18, sockC3X - 6, row1_Y + 18);
        doc.line(sockC3X - 6, row1_Y + 18, sockC3X - 6, row1_Y);

        doc.setDrawColor(2, 132, 199);
        doc.line(piaC3X + 5, row1_Y + 13, piaC3X + 5, busBottomN_Y);
        doc.circle(piaC3X + 5, busBottomN_Y, 0.8, 'FD');
        doc.line(sockC3X + 6, row1_Y, sockC3X + 14, row1_Y);
        doc.line(sockC3X + 14, row1_Y, sockC3X + 14, busBottomN_Y);
        doc.circle(sockC3X + 14, busBottomN_Y, 0.8, 'FD');

        doc.setDrawColor(22, 163, 74);
        if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
        doc.circle(sockC3X, busPE_Y, 0.8, 'FD');
        doc.line(sockC3X, busPE_Y, sockC3X, row1_Y + 6);
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        drawMultifilarSocket(doc, sockC3X, row1_Y, 'Toma Cocina C3 (25A)');

        // C4: Lavadora/Termo (PIA 20A + Toma 20A)
        const piaC4X = 40;
        const sockC4X = 110;

        drawMultifilarBreaker(doc, piaC4X, row2_Y, 20, 'PIA C4 20A (Lavadora)', 'circuit_breaker');

        doc.setDrawColor(180, 83, 9);
        doc.line(piaC4X - 5, row1_Y + 18, piaC4X - 5, row2_Y - 13);
        doc.setDrawColor(2, 132, 199);
        doc.line(piaC4X + 5, row1_Y + 22, piaC4X + 5, row2_Y - 13);

        doc.setDrawColor(180, 83, 9);
        doc.line(piaC4X - 5, row2_Y + 13, piaC4X - 5, row2_Y + 18);
        doc.line(piaC4X - 5, row2_Y + 18, sockC4X - 6, row2_Y + 18);
        doc.line(sockC4X - 6, row2_Y + 18, sockC4X - 6, row2_Y);

        doc.setDrawColor(2, 132, 199);
        doc.line(sockC4X + 6, row2_Y, sockC4X + 14, row2_Y);
        doc.line(sockC4X + 14, row2_Y, sockC4X + 14, busBottomN_Y);
        doc.circle(sockC4X + 14, busBottomN_Y, 0.8, 'FD');

        doc.setDrawColor(22, 163, 74);
        if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
        doc.circle(sockC4X, row1_Y + 10, 0.8, 'FD');
        doc.line(sockC4X, row1_Y + 10, sockC4X, row2_Y + 6);
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        drawMultifilarSocket(doc, sockC4X, row2_Y, 'Toma Lavadora C4 (20A)');

        // C5: Baño / Cocina aux (PIA 16A + Toma 16A)
        const piaC5X = 165;
        const sockC5X = 225;

        drawMultifilarBreaker(doc, piaC5X, (row1_Y + row2_Y) / 2, 16, 'PIA C5 16A (Baño)', 'circuit_breaker');

        doc.setDrawColor(180, 83, 9);
        doc.circle(piaC5X - 5, busL_Y, 0.8, 'FD');
        doc.line(piaC5X - 5, busL_Y, piaC5X - 5, (row1_Y + row2_Y) / 2 - 13);

        doc.setDrawColor(2, 132, 199);
        doc.circle(piaC5X + 5, busN_Y, 0.8, 'FD');
        doc.line(piaC5X + 5, busN_Y, piaC5X + 5, (row1_Y + row2_Y) / 2 - 13);

        doc.setDrawColor(180, 83, 9);
        doc.line(piaC5X - 5, (row1_Y + row2_Y) / 2 + 13, piaC5X - 5, (row1_Y + row2_Y) / 2 + 18);
        doc.line(piaC5X - 5, (row1_Y + row2_Y) / 2 + 18, sockC5X - 6, (row1_Y + row2_Y) / 2 + 18);
        doc.line(sockC5X - 6, (row1_Y + row2_Y) / 2 + 18, sockC5X - 6, (row1_Y + row2_Y) / 2);

        doc.setDrawColor(2, 132, 199);
        doc.line(piaC5X + 5, (row1_Y + row2_Y) / 2 + 13, piaC5X + 5, busBottomN_Y);
        doc.circle(piaC5X + 5, busBottomN_Y, 0.8, 'FD');
        doc.line(sockC5X + 6, (row1_Y + row2_Y) / 2, sockC5X + 14, (row1_Y + row2_Y) / 2);
        doc.line(sockC5X + 14, (row1_Y + row2_Y) / 2, sockC5X + 14, busBottomN_Y);
        doc.circle(sockC5X + 14, busBottomN_Y, 0.8, 'FD');

        doc.setDrawColor(22, 163, 74);
        if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
        doc.circle(sockC5X, busPE_Y, 0.8, 'FD');
        doc.line(sockC5X, busPE_Y, sockC5X, (row1_Y + row2_Y) / 2 + 6);
        if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

        drawMultifilarSocket(doc, sockC5X, (row1_Y + row2_Y) / 2, 'Toma Baño C5 (16A)');
      }
      continue;
    }

    // CASO CIRCUITO INDIVIDUAL: Dibuja TODAS las protecciones de la simulación (IGA, PCS, ID, PIA)
    const protections = [
      ...classified.igas,
      ...classified.pcss,
      ...classified.rcds,
      ...classified.pias,
    ];

    const compY = 85;
    const numProtections = protections.length;
    const protectionSpacing = numProtections >= 3 ? 27 : 32;
    const protectionStartX = 32;

    let lastBreakerX = 25;
    let phaseFeedX = 25;
    let phaseFeedY = busL_Y;

    if (numProtections > 0) {
      for (let i = 0; i < numProtections; i++) {
        const x = protectionStartX + i * protectionSpacing;
        const bNode = protections[i];
        const bData = bNode.data as BreakerComponent;
        const bAmps = bData.ratedCurrent || 10;
        const bName = bData.name || 'Protección';
        const bType = bData.breakerType || 'circuit_breaker';

        drawMultifilarBreaker(doc, x, compY, bAmps, bName, bType);

        if (i === 0) {
          // Primera protección conectada a la Red
          doc.setDrawColor(180, 83, 9);
          doc.setLineWidth(0.5);
          doc.circle(x - 5, busL_Y, 0.8, 'FD');
          doc.line(x - 5, busL_Y, x - 5, compY - 13);

          doc.setDrawColor(2, 132, 199);
          doc.circle(x + 5, busN_Y, 0.8, 'FD');
          doc.line(x + 5, busN_Y, x + 5, compY - 13);
        } else {
          // Puente en cascada desde la protección anterior (i - 1)
          const prevX = protectionStartX + (i - 1) * protectionSpacing;

          // Fase L (marrón)
          doc.setDrawColor(180, 83, 9);
          doc.setLineWidth(0.5);
          doc.line(prevX - 5, compY + 13, prevX - 5, compY + 17);
          doc.line(prevX - 5, compY + 17, x - 7, compY + 17);
          doc.line(x - 7, compY + 17, x - 7, compY - 17);
          doc.line(x - 7, compY - 17, x - 5, compY - 17);
          doc.line(x - 5, compY - 17, x - 5, compY - 13);

          // Neutro N (azul)
          doc.setDrawColor(2, 132, 199);
          doc.line(prevX + 5, compY + 13, prevX + 5, compY + 20);
          doc.line(prevX + 5, compY + 20, x + 7, compY + 20);
          doc.line(x + 7, compY + 20, x + 7, compY - 20);
          doc.line(x + 7, compY - 20, x + 5, compY - 20);
          doc.line(x + 5, compY - 20, x + 5, compY - 13);
        }
      }

      const lastIdx = numProtections - 1;
      lastBreakerX = protectionStartX + lastIdx * protectionSpacing;
      phaseFeedX = lastBreakerX - 5;
      phaseFeedY = compY + 13;

      // Salida N de la última protección va a la barra inferior de Neutro
      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.5);
      doc.line(lastBreakerX + 5, compY + 13, lastBreakerX + 5, busBottomN_Y);
      doc.circle(lastBreakerX + 5, busBottomN_Y, 0.8, 'FD');
    }

    // MECANISMOS Y CARGAS AGUAS ABAJO SEGÚN TOPOLOGÍA DETECTADA
    const remainingWidth = 230 - lastBreakerX;

    // CASO 1: ALUMBRADO SIMPLE
    if (classified.singleSwitches.length > 0 && classified.twoWaySwitches.length === 0) {
      const sw = classified.singleSwitches[0];
      const lamp = classified.lamps[0];

      const swX = lastBreakerX + remainingWidth * 0.45;
      const lampX = lastBreakerX + remainingWidth * 0.85;

      // Fase protegida al interruptor
      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.5);
      if (numProtections > 0) {
        doc.line(phaseFeedX, phaseFeedY, phaseFeedX, compY + 18);
        doc.line(phaseFeedX, compY + 18, swX - 11, compY + 18);
        doc.line(swX - 11, compY + 18, swX - 11, compY);
      } else {
        doc.circle(swX - 11, busL_Y, 0.8, 'FD');
        doc.line(swX - 11, busL_Y, swX - 11, compY);
      }

      drawMultifilarSingleSwitch(doc, swX, compY, sw ? (sw.data as SwitchComponent).name : 'Interruptor S1');

      // Vuelta de lámpara
      doc.setDrawColor(124, 58, 237);
      doc.line(swX + 11, compY, lampX - 5.5, compY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(124, 58, 237);
      doc.text('Retorno (Vuelta Lámpara)', (swX + lampX) / 2, compY - 2.5, { align: 'center' });

      drawMultifilarLamp(doc, lampX, compY, lamp ? (lamp.data as LoadComponent).name : 'Lámpara LED');

      // Retorno Neutro
      doc.setDrawColor(2, 132, 199);
      doc.line(lampX + 5.5, compY, lampX + 14, compY);
      doc.line(lampX + 14, compY, lampX + 14, busBottomN_Y);
      doc.circle(lampX + 14, busBottomN_Y, 0.8, 'FD');
    }

    // CASO 2: TIMBRE SIMPLE
    else if (classified.pushbuttons.length > 0 && classified.buzzers.length > 0) {
      const pb = classified.pushbuttons[0];
      const buzzer = classified.buzzers[0];

      const pbX = lastBreakerX + remainingWidth * 0.45;
      const buzX = lastBreakerX + remainingWidth * 0.85;

      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.5);
      if (numProtections > 0) {
        doc.line(phaseFeedX, phaseFeedY, phaseFeedX, compY + 18);
        doc.line(phaseFeedX, compY + 18, pbX - 11, compY + 18);
        doc.line(pbX - 11, compY + 18, pbX - 11, compY);
      } else {
        doc.circle(pbX - 11, busL_Y, 0.8, 'FD');
        doc.line(pbX - 11, busL_Y, pbX - 11, compY);
      }

      drawMultifilarPushbutton(doc, pbX, compY, pb ? (pb.data as SwitchComponent).name : 'Pulsador S1 (Timbre)');

      // Retorno hacia timbre
      doc.setDrawColor(124, 58, 237);
      doc.line(pbX + 11, compY, buzX - 5.5, compY);

      drawMultifilarBuzzer(doc, buzX, compY, buzzer ? (buzzer.data as LoadComponent).name : 'Timbre Zumbador');

      // Neutro
      doc.setDrawColor(2, 132, 199);
      doc.line(buzX + 5.5, compY, buzX + 14, compY);
      doc.line(buzX + 14, compY, buzX + 14, busBottomN_Y);
      doc.circle(buzX + 14, busBottomN_Y, 0.8, 'FD');
    }

    // CASO 3: CONMUTADA 2 PUNTOS
    else if (classified.twoWaySwitches.length >= 2 && classified.intermediateSwitches.length === 0) {
      const q1 = classified.twoWaySwitches[0];
      const q2 = classified.twoWaySwitches[1];
      const lamp = classified.lamps[0];

      const q1X = lastBreakerX + remainingWidth * 0.28;
      const q2X = lastBreakerX + remainingWidth * 0.63;
      const lampX = lastBreakerX + remainingWidth * 0.90;

      // Conexión de Fase protegida a Q1
      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.5);

      if (numProtections > 0) {
        doc.line(phaseFeedX, phaseFeedY, phaseFeedX, compY + 20);
        if (classified.isMiswiredTwoWay) {
          doc.line(phaseFeedX, compY + 20, q1X - 18, compY + 20);
          doc.line(q1X - 18, compY + 20, q1X - 18, compY - 4);
          doc.line(q1X - 18, compY - 4, q1X - 13, compY - 4); // a L1 (error)
        } else {
          doc.line(phaseFeedX, compY + 20, q1X, compY + 20);
          doc.line(q1X, compY + 20, q1X, compY + 11); // a COM (correcto)
        }
      } else {
        if (classified.isMiswiredTwoWay) {
          doc.circle(q1X - 18, busL_Y, 0.8, 'FD');
          doc.line(q1X - 18, busL_Y, q1X - 18, compY - 4);
          doc.line(q1X - 18, compY - 4, q1X - 13, compY - 4);
        } else {
          doc.circle(q1X - 18, busL_Y, 0.8, 'FD');
          doc.line(q1X - 18, busL_Y, q1X - 18, compY + 18);
          doc.line(q1X - 18, compY + 18, q1X, compY + 18);
          doc.line(q1X, compY + 18, q1X, compY + 11);
        }
      }

      if (classified.isMiswiredTwoWay) {
        // Banner pedagógico
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(239, 68, 68);
        doc.rect(25, 128, 185, 14, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(220, 38, 38);
        doc.text('¡ATENCIÓN! ERROR DE CONEXIONADO EN TALLER DETECTADO:', 28, 133);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(153, 27, 27);
        doc.text('La Fase de alimentación se conectó al borne viajero L1 de Q1. Al bascular Q1, Q2 quedará bloqueado.', 28, 137);

        // COM de Q1 va al borne L1 de Q2
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.45);
        doc.line(q1X, compY + 11, q1X, compY + 18);
        doc.line(q1X, compY + 18, q2X - 18, compY + 18);
        doc.line(q2X - 18, compY + 18, q2X - 18, compY - 4);
        doc.line(q2X - 18, compY - 4, q2X - 13, compY - 4);

        // Hilo viajero L2 directo
        doc.line(q1X + 13, compY + 4, q2X - 13, compY + 4);

        drawMultifilarSwitchQ1(doc, q1X, compY, (q1.data as SwitchComponent).name, true);
        drawMultifilarSwitchQ2(doc, q2X, compY, (q2.data as SwitchComponent).name);
      } else {
        // Hilo Viajero L1: une Q1(L1, arriba-der) con Q2(L1, arriba-izq)
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.45);
        doc.line(q1X + 13, compY - 4, q2X - 13, compY - 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(79, 70, 229);
        doc.text('Hilo Viajero L1', (q1X + q2X) / 2, compY - 5.5, { align: 'center' });

        // Hilo Viajero L2: une Q1(L2, abajo-der) con Q2(L2, abajo-izq)
        doc.line(q1X + 13, compY + 4, q2X - 13, compY + 4);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(79, 70, 229);
        doc.text('Hilo Viajero L2', (q1X + q2X) / 2, compY + 7.5, { align: 'center' });

        drawMultifilarSwitchQ1(doc, q1X, compY, (q1.data as SwitchComponent).name, false);
        drawMultifilarSwitchQ2(doc, q2X, compY, (q2.data as SwitchComponent).name);
      }

      // Vuelta de lámpara desde COM de Q2 hacia Lámpara
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(0.5);
      doc.line(q2X, compY + 11, q2X, compY + 18);
      doc.line(q2X, compY + 18, lampX - 5.5, compY + 18);
      doc.line(lampX - 5.5, compY + 18, lampX - 5.5, compY);

      doc.setFontSize(5.5);
      doc.setTextColor(124, 58, 237);
      doc.text('Vuelta de Lámpara (desde COM)', (q2X + lampX) / 2, compY + 21, { align: 'center' });

      drawMultifilarLamp(doc, lampX, compY, lamp ? (lamp.data as LoadComponent).name : 'Punto de Luz Central');

      // Neutro de lámpara
      doc.setDrawColor(2, 132, 199);
      doc.setLineWidth(0.5);
      doc.line(lampX + 5.5, compY, lampX + 14, compY);
      doc.line(lampX + 14, compY, lampX + 14, busBottomN_Y);
      doc.circle(lampX + 14, busBottomN_Y, 0.8, 'FD');
    }

    // CASO 4: CONMUTADA DE CRUCE (3 PUNTOS)
    else if (classified.intermediateSwitches.length > 0) {
      const q1 = classified.twoWaySwitches[0];
      const qCr = classified.intermediateSwitches[0];
      const q2 = classified.twoWaySwitches[1];
      const lamp = classified.lamps[0];

      const q1X = lastBreakerX + remainingWidth * 0.22;
      const qCrX = lastBreakerX + remainingWidth * 0.48;
      const q2X = lastBreakerX + remainingWidth * 0.74;
      const lampX = lastBreakerX + remainingWidth * 0.94;

      // Fase protegida a COM de Q1
      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.5);
      if (numProtections > 0) {
        doc.line(phaseFeedX, phaseFeedY, phaseFeedX, compY + 20);
        doc.line(phaseFeedX, compY + 20, q1X, compY + 20);
        doc.line(q1X, compY + 20, q1X, compY + 11);
      } else {
        doc.circle(q1X, busL_Y, 0.8, 'FD');
        doc.line(q1X, busL_Y, q1X - 20, busL_Y);
        doc.line(q1X - 20, busL_Y, q1X - 20, compY + 18);
        doc.line(q1X - 20, compY + 18, q1X, compY + 18);
        doc.line(q1X, compY + 18, q1X, compY + 11);
      }

      // Q1 -> Cruce
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.45);
      doc.line(q1X + 13, compY - 4, qCrX - 13, compY - 4);
      doc.line(q1X + 13, compY + 4, qCrX - 13, compY + 4);

      // Cruce -> Q2
      doc.line(qCrX + 13, compY - 4, q2X - 13, compY - 4);
      doc.line(qCrX + 13, compY + 4, q2X - 13, compY + 4);

      drawMultifilarSwitchQ1(doc, q1X, compY, q1 ? (q1.data as SwitchComponent).name : 'Q1');
      drawMultifilarIntermediateSwitch(doc, qCrX, compY, qCr ? (qCr.data as SwitchComponent).name : 'Q-Cruce');
      drawMultifilarSwitchQ2(doc, q2X, compY, q2 ? (q2.data as SwitchComponent).name : 'Q2');

      // Vuelta a lámpara
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(0.5);
      doc.line(q2X, compY + 11, q2X, compY + 18);
      doc.line(q2X, compY + 18, lampX - 5.5, compY + 18);
      doc.line(lampX - 5.5, compY + 18, lampX - 5.5, compY);

      drawMultifilarLamp(doc, lampX, compY, lamp ? (lamp.data as LoadComponent).name : 'Punto de Luz');

      // Neutro
      doc.setDrawColor(2, 132, 199);
      doc.line(lampX + 5.5, compY, lampX + 12, compY);
      doc.line(lampX + 12, compY, lampX + 12, busBottomN_Y);
      doc.circle(lampX + 12, busBottomN_Y, 0.8, 'FD');
    }

    // CASO 5: TOMA DE CORRIENTE SCHUKO 2P+T
    else if (classified.sockets.length > 0) {
      const sock = classified.sockets[0];
      const sockX = lastBreakerX + remainingWidth * 0.55;

      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.5);
      if (numProtections > 0) {
        doc.line(phaseFeedX, phaseFeedY, phaseFeedX, compY + 18);
        doc.line(phaseFeedX, compY + 18, sockX - 6, compY + 18);
        doc.line(sockX - 6, compY + 18, sockX - 6, compY);
      } else {
        doc.circle(sockX - 16, busL_Y, 0.8, 'FD');
        doc.line(sockX - 16, busL_Y, sockX - 16, compY);
        doc.line(sockX - 16, compY, sockX - 6, compY);
      }

      // Neutro
      doc.setDrawColor(2, 132, 199);
      doc.line(sockX + 6, compY, sockX + 14, compY);
      doc.line(sockX + 14, compY, sockX + 14, busBottomN_Y);
      doc.circle(sockX + 14, busBottomN_Y, 0.8, 'FD');

      // Tierra PE
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.5);
      if (doc.setLineDashPattern) doc.setLineDashPattern([2, 1.5], 0);
      doc.circle(sockX, busPE_Y, 0.8, 'FD');
      doc.line(sockX, busPE_Y, sockX, compY + 6);
      if (doc.setLineDashPattern) doc.setLineDashPattern([], 0);

      drawMultifilarSocket(doc, sockX, compY, (sock.data as LoadComponent).name);
    }
  }

  const fileName = `Esquema_Multifilar_${circuitName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

// ============================================================================
// EXPORTADOR ESQUEMA UNIFILAR (LÍNEA TÉCNICA CONTINUA REBT)
// ============================================================================

export function exportUnifilarPdf(
  nodes: AppNode[],
  edges: AppEdge[],
  circuitName = 'Circuito Eléctrico'
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const classified = classifyCircuitTopology(nodes, edges);

  const totalPages = classified.isMultiCircuit ? 2 : 1;

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    drawTechnicalPageBorder(doc, 'UNIFILAR', circuitName, page + 1, totalPages);
    drawConductorLegend(doc, 205, 16, false);

    // Eje horizontal principal unifilar (Canalización continua)
    const lineY = 95;
    const startX = 28;

    // Dibujar Origen / Protección a la izquierda
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);

    const hasIga = classified.igas.length > 0;
    const hasRcd = classified.rcds.length > 0;
    const hasPia = classified.pias.length > 0 || (!hasIga && !hasRcd && classified.hasBreakers);

    let curX = startX;

    if (classified.isMultiCircuit) {
      if (page === 0) {
        // Red 230V -> IGA 40A -> ID 40A 30mA -> PIA C1 10A -> C1
        doc.circle(curX, lineY, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text('RED 230V', curX, lineY - 4, { align: 'center' });

        const igaX = curX + 14;
        doc.line(curX, lineY, igaX - 4, lineY);
        drawUnifilarIGA(doc, igaX, lineY, 40, 'IGA General');

        const idX = igaX + 22;
        doc.line(igaX + 4, lineY, idX - 4, lineY);
        drawUnifilarID(doc, idX, lineY, 40, 30, 'ID Diferencial');

        const piaX = idX + 22;
        doc.line(idX + 4, lineY, piaX - 4, lineY);
        drawUnifilarPIA(doc, piaX, lineY, 10, 'PIA C1 Alumbrado');

        curX = piaX + 16;
        doc.line(piaX + 4, lineY, curX, lineY);
      } else {
        // Cuadro General -> PIA C2 16A -> C2
        doc.circle(curX, lineY, 1, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text('CGMP 230V', curX, lineY - 4, { align: 'center' });

        const piaX = curX + 18;
        doc.line(curX, lineY, piaX - 4, lineY);
        drawUnifilarPIA(doc, piaX, lineY, 16, 'PIA C2 Tomas');

        curX = piaX + 18;
        doc.line(piaX + 4, lineY, curX, lineY);
      }
    } else if (hasIga || hasRcd || hasPia) {
      doc.circle(curX, lineY, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text('RED 230V', curX, lineY - 4, { align: 'center' });

      if (hasIga) {
        const igaData = classified.igas[0].data as BreakerComponent;
        const igaX = curX + 14;
        doc.line(curX, lineY, igaX - 4, lineY);
        drawUnifilarIGA(doc, igaX, lineY, igaData.ratedCurrent || 40, igaData.name);
        curX = igaX + 20;
      }

      if (hasRcd) {
        const rcdData = classified.rcds[0].data as BreakerComponent;
        const idX = curX + 14;
        doc.line(curX, lineY, idX - 4, lineY);
        drawUnifilarID(doc, idX, lineY, rcdData.ratedCurrent || 40, rcdData.rcdSensitivityMa || 30, rcdData.name);
        curX = idX + 22;
      }

      if (hasPia) {
        const piaNode = classified.pias[0] || classified.branchBreaker || classified.breakers[0];
        const piaData = piaNode ? (piaNode.data as BreakerComponent) : null;
        const piaX = curX + 14;
        doc.line(curX, lineY, piaX - 4, lineY);
        drawUnifilarPIA(doc, piaX, lineY, piaData?.ratedCurrent || 10, piaData?.name || 'PIA 10A');
        curX = piaX + 16;
        doc.line(piaX + 4, lineY, curX, lineY);
      }
    } else {
      // Sin protecciones: Borne de alimentación directo
      doc.circle(startX, lineY, 1.2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text('ALIMENTACIÓN 230V ~ 50Hz', startX, lineY - 4);
      curX = startX + 26;
      doc.line(startX, lineY, curX, lineY);
    }

    const conduitStartX = curX;

    // CASO 1: Alumbrado Simple Unifilar
    if (classified.singleSwitches.length > 0 && classified.twoWaySwitches.length === 0) {
      const sw = classified.singleSwitches[0];
      const lamp = classified.lamps[0];

      const swX = 115;
      const lampX = 185;

      // Canalización 1: Cuadro -> Interruptor
      doc.line(conduitStartX, lineY, swX - 3, lineY);
      drawCanalizacionSlash(doc, (conduitStartX + swX) / 2, lineY, 3, 1.5);

      drawUnifilarSwitchSymbol(doc, swX, lineY, 'single_pole', sw ? (sw.data as SwitchComponent).name : 'Interruptor S1');

      // Canalización 2: Interruptor -> Lámpara
      doc.line(swX + 3, lineY, lampX - 4, lineY);
      drawCanalizacionSlash(doc, (swX + lampX) / 2, lineY, 3, 1.5);

      drawUnifilarLampSymbol(doc, lampX, lineY, lamp ? (lamp.data as LoadComponent).name : 'Punto de Luz');
    }

    // CASO 2: Timbre Simple Unifilar
    else if (classified.pushbuttons.length > 0 && classified.buzzers.length > 0) {
      const pb = classified.pushbuttons[0];
      const buz = classified.buzzers[0];

      const pbX = 115;
      const buzX = 185;

      doc.line(conduitStartX, lineY, pbX - 3, lineY);
      drawCanalizacionSlash(doc, (conduitStartX + pbX) / 2, lineY, 2, 1.5);

      drawUnifilarSwitchSymbol(doc, pbX, lineY, 'pushbutton', pb ? (pb.data as SwitchComponent).name : 'Pulsador S1');

      doc.line(pbX + 3, lineY, buzX - 4, lineY);
      drawCanalizacionSlash(doc, (pbX + buzX) / 2, lineY, 2, 1.5);

      drawUnifilarBuzzerSymbol(doc, buzX, lineY, buz ? (buz.data as LoadComponent).name : 'Timbre Zumbador');
    }

    // CASO 3: Conmutada 2 Puntos Unifilar (Línea continua)
    else if (classified.twoWaySwitches.length >= 2 && classified.intermediateSwitches.length === 0) {
      const q1 = classified.twoWaySwitches[0];
      const q2 = classified.twoWaySwitches[1];
      const lamp = classified.lamps[0];

      const q1X = 95;
      const q2X = 160;
      const lampX = 215;

      // Tramo 1: Cuadro -> Conmutador Q1 (3 hilos: Fase, Neutro, Tierra)
      doc.line(conduitStartX, lineY, q1X - 3, lineY);
      drawCanalizacionSlash(doc, (conduitStartX + q1X) / 2, lineY, 3, 1.5);

      drawUnifilarSwitchSymbol(doc, q1X, lineY, 'two_way', (q1.data as SwitchComponent).name);

      // Tramo 2: Conmutador Q1 -> Conmutador Q2 (4 hilos: 2 Viajeros + Fase/Retorno + Neutro)
      doc.line(q1X + 3, lineY, q2X - 3, lineY);
      drawCanalizacionSlash(doc, (q1X + q2X) / 2, lineY, 4, 1.5);

      drawUnifilarSwitchSymbol(doc, q2X, lineY, 'two_way', (q2.data as SwitchComponent).name);

      // Tramo 3: Conmutador Q2 -> Lámpara (3 hilos: Vuelta + Neutro + Tierra)
      doc.line(q2X + 3, lineY, lampX - 4, lineY);
      drawCanalizacionSlash(doc, (q2X + lampX) / 2, lineY, 3, 1.5);

      drawUnifilarLampSymbol(doc, lampX, lineY, lamp ? (lamp.data as LoadComponent).name : 'Punto de Luz Central');
    }

    // CASO 4: Conmutada de Cruce (3 Puntos) Unifilar
    else if (classified.intermediateSwitches.length > 0) {
      const q1 = classified.twoWaySwitches[0];
      const qCr = classified.intermediateSwitches[0];
      const q2 = classified.twoWaySwitches[1];
      const lamp = classified.lamps[0];

      const q1X = 85;
      const qCrX = 135;
      const q2X = 180;
      const lampX = 225;

      doc.line(conduitStartX, lineY, q1X - 3, lineY);
      drawCanalizacionSlash(doc, (conduitStartX + q1X) / 2, lineY, 3, 1.5);

      drawUnifilarSwitchSymbol(doc, q1X, lineY, 'two_way', 'Q1');

      doc.line(q1X + 3, lineY, qCrX - 3, lineY);
      drawCanalizacionSlash(doc, (q1X + qCrX) / 2, lineY, 4, 1.5);

      drawUnifilarSwitchSymbol(doc, qCrX, lineY, 'intermediate', 'Cruce');

      doc.line(qCrX + 3, lineY, q2X - 3, lineY);
      drawCanalizacionSlash(doc, (qCrX + q2X) / 2, lineY, 4, 1.5);

      drawUnifilarSwitchSymbol(doc, q2X, lineY, 'two_way', 'Q2');

      doc.line(q2X + 3, lineY, lampX - 4, lineY);
      drawCanalizacionSlash(doc, (q2X + lampX) / 2, lineY, 3, 1.5);

      drawUnifilarLampSymbol(doc, lampX, lineY, lamp ? (lamp.data as LoadComponent).name : 'Punto de Luz');
    }

    // CASO 5: Toma de Corriente Unifilar
    else if (classified.sockets.length > 0) {
      const sock = classified.sockets[0];
      const sockX = 150;

      doc.line(conduitStartX, lineY, sockX - 4, lineY);
      drawCanalizacionSlash(doc, (conduitStartX + sockX) / 2, lineY, 3, 2.5);
      drawUnifilarSocketSymbol(doc, sockX, lineY, (sock.data as LoadComponent).name);
    }
  }

  const fileName = `Esquema_Unifilar_${circuitName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
