import type {
  AppEdge,
  AppNode,
  BreakerComponent,
  CableData,
  LoadComponent,
  PowerSourceComponent,
  SimulationResult,
  SwitchComponent,
  ValidationError,
} from '../types/electrical';

const MAX_AMPACITY_BY_SECTION: Record<number, number> = {
  1.5: 16,
  2.5: 20,
  4.0: 25,
  6.0: 32,
  10.0: 50,
  16.0: 63,
};

export function validateElectricalSchematic(
  nodes: AppNode[],
  edges: AppEdge[],
  simulationResult?: SimulationResult
): ValidationError[] {
  const errors: ValidationError[] = [];

  const sourceNodes = nodes.filter((n) => n.data.type === 'source');
  const breakerNodes = nodes.filter((n) => n.data.type === 'breaker');
  const loadNodes = nodes.filter((n) => n.data.type === 'load');
  const switchNodes = nodes.filter((n) => n.data.type === 'switch');

  if (sourceNodes.length === 0) {
    errors.push({
      id: 'val-no-source',
      code: 'MISSING_PROTECTION',
      severity: 'warning',
      title: 'Sin fuente de alimentación',
      message: 'El esquema no cuenta con una toma de red o fuente 230V activa.',
      nodeIds: [],
      edgeIds: [],
      suggestedFix: 'Añade un nodo de Alimentación General (230V AC) desde la paleta de componentes.',
    });
  }

  if (simulationResult?.hasShortCircuit) {
    errors.push({
      id: 'val-direct-short',
      code: 'SHORT_CIRCUIT',
      severity: 'critical',
      title: '¡Peligro de Cortocircuito Directo!',
      message: 'Existe un camino cerrado de impedancia cero entre Fase (L) y Neutro (N) o Tierra (PE). La corriente tiende a infinito.',
      nodeIds: Array.from(simulationResult.energizedNodeIds),
      edgeIds: Array.from(simulationResult.shortCircuitEdgeIds),
      suggestedFix: 'Revisa las conexiones. Fase y Neutro nunca deben unirse directamente sin pasar por una carga (bombilla, motor, etc.).',
    });
  }

  for (const bNode of breakerNodes) {
    const breaker = bNode.data as BreakerComponent;
    if (breaker.isTripped) {
      errors.push({
        id: `val-breaker-tripped-${bNode.id}`,
        code: 'BREAKER_TRIPPED',
        severity: 'error',
        title: `Protección Disparada (${breaker.name})`,
        message: breaker.tripReason || 'El magnetotérmico ha disparado por sobreintensidad o cortocircuito.',
        nodeIds: [bNode.id],
        edgeIds: [],
        suggestedFix: 'Soluciona la anomalía en el circuito aguas abajo y pulsa "Rearmar" en el magnetotérmico.',
      });
    }

    const connectedEdges = edges.filter(
      (e) => e.source === bNode.id || e.target === bNode.id
    );

    for (const edge of connectedEdges) {
      const cable = edge.data as CableData;
      if (!cable) continue;

      const maxSafeCurrent = MAX_AMPACITY_BY_SECTION[cable.crossSectionMm2] || 16;
      if (breaker.ratedCurrent > maxSafeCurrent) {
        errors.push({
          id: `val-cable-undersized-${edge.id}`,
          code: 'UNDERSIZED_CABLE',
          severity: 'error',
          title: 'Sección de cable insuficiente para la protección',
          message: `Cable de ${cable.crossSectionMm2} mm² conectado a magnetotérmico de ${breaker.ratedCurrent}A. La intensidad admisible del cable es de solo ${maxSafeCurrent}A.`,
          nodeIds: [bNode.id],
          edgeIds: [edge.id],
          suggestedFix: `Aumenta la sección del conductor a mínimo ${getRecommendedSection(breaker.ratedCurrent)} mm² o reduce el calibre del magnetotérmico a ≤ ${maxSafeCurrent}A.`,
        });
      }
    }
  }

  for (const edge of edges) {
    const cable = edge.data as CableData;
    if (!cable) continue;

    const isGroundSource = edge.sourceHandle?.includes('pe') || edge.targetHandle?.includes('pe');
    const isPhaseOrNeutralTarget =
      edge.sourceHandle?.includes('term-src-l') ||
      edge.sourceHandle?.includes('term-src-n') ||
      edge.targetHandle?.includes('term-src-l') ||
      edge.targetHandle?.includes('term-src-n');

    if (isGroundSource && isPhaseOrNeutralTarget) {
      errors.push({
        id: `val-earth-fault-${edge.id}`,
        code: 'EARTH_FAULT',
        severity: 'critical',
        title: 'Derivación directa a Tierra (Fallo de Aislamiento)',
        message: 'Se ha interconectado el conductor de protección (Tierra PE) directamente con la Fase o Neutro.',
        nodeIds: [edge.source, edge.target],
        edgeIds: [edge.id],
        suggestedFix: 'Desconecta el conductor de tierra de los terminales activos L y N.',
      });
    }

    if (cable.wireType === 'ground' && (edge.sourceHandle?.includes('load-l') || edge.targetHandle?.includes('load-l'))) {
      errors.push({
        id: `val-ground-as-phase-${edge.id}`,
        code: 'INCOMPATIBLE_POLARITY',
        severity: 'warning',
        title: 'Uso indebido de conductor de tierra como fase',
        message: 'El cable definido como Tierra (PE) está conectado al borne de Fase de la carga.',
        nodeIds: [edge.source, edge.target],
        edgeIds: [edge.id],
        suggestedFix: 'Cambia el tipo de conductor a Fase (marrón/negro/gris) en las propiedades del cable.',
      });
    }
  }

  for (const lNode of loadNodes) {
    const load = lNode.data as LoadComponent;
    const lEdges = edges.filter((e) => e.source === lNode.id || e.target === lNode.id);

    const hasLConnection = lEdges.some(
      (e) => e.sourceHandle === 'term-load-l' || e.targetHandle === 'term-load-l'
    );
    const hasNConnection = lEdges.some(
      (e) => e.sourceHandle === 'term-load-n' || e.targetHandle === 'term-load-n'
    );

    if (hasLConnection && !hasNConnection) {
      errors.push({
        id: `val-missing-neutral-${lNode.id}`,
        code: 'MISSING_NEUTRAL',
        severity: 'warning',
        title: `Retorno de Neutro no conectado (${load.name})`,
        message: 'La carga está recibiendo potencial de Fase pero no dispone del retorno de Neutro necesario para cerrar el circuito.',
        nodeIds: [lNode.id],
        edgeIds: [],
        suggestedFix: 'Conecta el borne Neutro (N) de la carga al conductor Neutro de la fuente o cuadro.',
      });
    } else if (!hasLConnection && hasNConnection) {
      errors.push({
        id: `val-open-phase-${lNode.id}`,
        code: 'OPEN_CIRCUIT',
        severity: 'info',
        title: `Alimentación de Fase no conectada (${load.name})`,
        message: 'La carga tiene retorno de neutro pero le falta la conexión a la Fase de alimentación.',
        nodeIds: [lNode.id],
        edgeIds: [],
        suggestedFix: 'Conecta la Fase (L) a través de los interruptores o directamente a la protección.',
      });
    }

    if (load.loadType === 'socket') {
      const hasPEConnection = lEdges.some(
        (e) => e.sourceHandle === 'term-load-pe' || e.targetHandle === 'term-load-pe'
      );
      if (!hasPEConnection) {
        errors.push({
          id: `val-missing-ground-${lNode.id}`,
          code: 'EARTH_FAULT',
          severity: 'warning',
          title: `Toma sin toma de tierra (${load.name})`,
          message: 'Según REBT ITC-BT-19 e ITC-BT-25, todas las tomas de corriente Schuko deben disponer de conexión al conductor de protección (Tierra PE).',
          nodeIds: [lNode.id],
          edgeIds: [],
          suggestedFix: 'Conecta el borne PE de la toma al conductor de protección de tierra (amarillo-verde).',
        });
      }
    }
  }

  const twoWaySwitches = switchNodes.filter(
    (s) => (s.data as SwitchComponent).switchType === 'two_way'
  );

  if (twoWaySwitches.length === 1) {
    errors.push({
      id: 'val-single-two-way',
      code: 'OPEN_CIRCUIT',
      severity: 'info',
      title: 'Conmutador aislado',
      message: 'Tienes un conmutador simple sin un segundo conmutador emparejado. Para conmutar desde 2 puntos se requieren 2 conmutadores.',
      nodeIds: [twoWaySwitches[0].id],
      edgeIds: [],
      suggestedFix: 'Añade un segundo conmutador y une los bornes viajeros (L1-L1 y L2-L2).',
    });
  }

  for (const sNode of twoWaySwitches) {
    const sEdges = edges.filter((e) => e.source === sNode.id || e.target === sNode.id);
    const hasPhaseAtTraveler = sEdges.some((e) => {
      const handle = e.source === sNode.id ? e.sourceHandle : e.targetHandle;
      const otherNodeId = e.source === sNode.id ? e.target : e.source;
      const otherNode = nodes.find((n) => n.id === otherNodeId);
      const isTraveler = handle === 'term-sw-l1' || handle === 'term-sw-l2';
      const isSourceOrBreaker =
        otherNode && (otherNode.data.type === 'breaker' || otherNode.data.type === 'source');
      return isTraveler && isSourceOrBreaker;
    });

    if (hasPhaseAtTraveler) {
      errors.push({
        id: `val-miswired-tw-${sNode.id}`,
        code: 'INCOMPATIBLE_POLARITY',
        severity: 'error',
        title: `Error de conexionado en conmutada (${(sNode.data as SwitchComponent).name})`,
        message: 'La Fase de alimentación está conectada directamente a un borne viajero (L1/L2) en lugar de al borne Común (COM). El circuito quedará bloqueado cuando este conmutador bascule a la otra posición.',
        nodeIds: [sNode.id],
        edgeIds: sEdges.map((e) => e.id),
        suggestedFix: 'Desconecta la Fase del borne viajero y conéctala al borne Común (COM) del conmutador.',
      });
    }
  }

  return errors;
}

function getRecommendedSection(breakerAmps: number): number {
  if (breakerAmps <= 16) return 1.5;
  if (breakerAmps <= 20) return 2.5;
  if (breakerAmps <= 25) return 4.0;
  if (breakerAmps <= 32) return 6.0;
  if (breakerAmps <= 50) return 10.0;
  return 16.0;
}
