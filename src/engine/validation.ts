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
  1.5: 10, // ITC-BT-25 (C1 Alumbrado): Calibre máximo admisible de PIA 10A
  2.5: 16, // ITC-BT-25 (C2 Tomas / C5): Calibre máximo admisible de PIA 16A
  4.0: 20, // ITC-BT-25 (C4 Lavadora/Termo): Calibre máximo admisible de PIA 20A
  6.0: 25, // ITC-BT-25 (C3 Cocina/Horno): Calibre máximo admisible de PIA 25A
  10.0: 40, // Derivación individual / IGA: Calibre máximo admisible de PIA 40A
  16.0: 63,
};

const MAX_BREAKER_BY_SECTION: Record<number, number> = {
  1.5: 10,
  2.5: 16,
  4.0: 20,
  6.0: 25,
  10.0: 40,
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

      const maxSafeBreaker = MAX_BREAKER_BY_SECTION[cable.crossSectionMm2] || 10;
      if (breaker.ratedCurrent > maxSafeBreaker) {
        const recommendedSection = getRecommendedSection(breaker.ratedCurrent);
        errors.push({
          id: `val-cable-undersized-${edge.id}`,
          code: 'UNDERSIZED_CABLE',
          severity: 'error',
          title: `Calibre de protección excesivo para cable de ${cable.crossSectionMm2} mm²`,
          message: `Cable de ${cable.crossSectionMm2} mm² conectado a magnetotérmico de ${breaker.ratedCurrent}A. Según REBT ITC-BT-25, la sección de ${cable.crossSectionMm2} mm² solo puede protegerse con un PIA de calibre ≤ ${maxSafeBreaker}A${cable.crossSectionMm2 <= 1.5 ? ' (exclusivo para alumbrado C1)' : ''}. Para un magnetotérmico de ${breaker.ratedCurrent}A se exige una sección mínima de ${recommendedSection} mm².`,
          nodeIds: [bNode.id],
          edgeIds: [edge.id],
          suggestedFix: `Aumenta la sección del conductor a mínimo ${recommendedSection} mm² en las propiedades del cable o reduce el calibre del magnetotérmico a ≤ ${maxSafeBreaker}A.`,
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
      const isOvenCooktop = load.ratedPowerWatts >= 2500;
      const isWashingMachine = load.ratedPowerWatts >= 2000 && load.ratedPowerWatts < 2500;
      const minRequiredSection = isOvenCooktop ? 6.0 : isWashingMachine ? 4.0 : 2.5;
      const circuitCode = isOvenCooktop
        ? 'C3 (Cocina/Horno - 25A)'
        : isWashingMachine
        ? 'C4 (Lavadora/Termo - 20A)'
        : 'C2/C5 (Tomas de uso general - 16A)';

      // 1. Verificación obligatoria de Toma de Tierra PE (ITC-BT-19)
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

      // 2. Validación de sección mínima de conductores en circuito de tomas (REBT ITC-BT-25 Tabla 1)
      const socketEdges = edges.filter((e) => e.source === lNode.id || e.target === lNode.id);
      for (const edge of socketEdges) {
        const cable = edge.data as CableData;
        if (!cable) continue;

        if (cable.crossSectionMm2 < minRequiredSection) {
          const isLightingCable = cable.crossSectionMm2 <= 1.5;
          errors.push({
            id: `val-socket-undersized-${edge.id}`,
            code: 'UNDERSIZED_CABLE',
            severity: 'error',
            title: `Sección antirreglamentaria en toma (${load.name})`,
            message: isLightingCable
              ? `Cable de ${cable.crossSectionMm2} mm² conectado a toma de corriente. Según REBT ITC-BT-25 (Tabla 1) e ITC-BT-19, el conductor de 1.5 mm² es de uso exclusivo para alumbrado (C1). Las tomas de corriente generales exigen una sección mínima obligatoria de ${minRequiredSection} mm² (${circuitCode}).`
              : `Cable de ${cable.crossSectionMm2} mm² insuficiente para la toma (${load.ratedPowerWatts}W). Según REBT ITC-BT-25, el circuito ${circuitCode} exige una sección mínima obligatoria de ${minRequiredSection} mm².`,
            nodeIds: [lNode.id],
            edgeIds: [edge.id],
            suggestedFix: `Aumenta la sección del conductor a mínimo ${minRequiredSection} mm² en las propiedades del cable.`,
          });
        }

        // 3. Verificación de protección aguas arriba para la toma (REBT ITC-BT-25)
        const otherNodeId = edge.source === lNode.id ? edge.target : edge.source;
        const otherNode = nodes.find((n) => n.id === otherNodeId);
        if (otherNode && otherNode.data.type === 'breaker') {
          const brk = otherNode.data as BreakerComponent;
          if (brk.breakerType === 'circuit_breaker' && brk.ratedCurrent < 16) {
            errors.push({
              id: `val-socket-breaker-undersized-${otherNode.id}-${lNode.id}`,
              code: 'UNDERSIZED_CABLE',
              severity: 'error',
              title: `Protección antirreglamentaria para tomas (${brk.name})`,
              message: `La toma está conectada a un magnetotérmico de ${brk.ratedCurrent}A. Según REBT ITC-BT-25, las tomas de corriente generales corresponden al circuito C2 y deben protegerse con un PIA de 16A y cable de 2.5 mm². Un PIA de 10A es de uso exclusivo para alumbrado (C1).`,
              nodeIds: [otherNode.id, lNode.id],
              edgeIds: [edge.id],
              suggestedFix: 'Sustituye la protección por un PIA de 16A (C2) y cableado de 2.5 mm².',
            });
          }

          // Verificar cables que alimentan dicho magnetotérmico desde la red
          const upstreamEdges = edges.filter(
            (e) => (e.source === otherNode.id || e.target === otherNode.id) && e.id !== edge.id
          );
          for (const upEdge of upstreamEdges) {
            const upCable = upEdge.data as CableData;
            if (upCable && upCable.crossSectionMm2 < minRequiredSection) {
              errors.push({
                id: `val-socket-upstream-undersized-${upEdge.id}`,
                code: 'UNDERSIZED_CABLE',
                severity: 'error',
                title: `Alimentación aguas arriba insuficiente para tomas (${load.name})`,
                message: `El cable que alimenta la protección tiene una sección de ${upCable.crossSectionMm2} mm². Según REBT ITC-BT-25, todo el circuito de tomas exige una sección mínima continua de ${minRequiredSection} mm². El conductor de 1.5 mm² solo debe usarse para luz.`,
                nodeIds: [otherNode.id, lNode.id],
                edgeIds: [upEdge.id],
                suggestedFix: `Aumenta la sección del conductor a mínimo ${minRequiredSection} mm².`,
              });
            }
          }
        }
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

export function getRecommendedSection(breakerAmps: number): number {
  if (breakerAmps <= 10) return 1.5; // C1 Alumbrado
  if (breakerAmps <= 16) return 2.5; // C2 Tomas generales / C5
  if (breakerAmps <= 20) return 4.0; // C4 Lavadora / Termo
  if (breakerAmps <= 25) return 6.0; // C3 Cocina / Horno
  if (breakerAmps <= 40) return 10.0; // Derivación individual / IGA
  return 16.0;
}
