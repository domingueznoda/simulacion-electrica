import type {
  AnyElectricalComponent,
  AppEdge,
  AppNode,
  BreakerComponent,
  CableData,
  LoadComponent,
  PowerSourceComponent,
  SimulationResult,
  SwitchComponent,
} from '../types/electrical';

interface GraphTerminalRef {
  nodeId: string;
  terminalId: string;
}

interface InternalEdge {
  id: string;
  sourceNodeId: string;
  sourceTerminalId: string;
  targetNodeId: string;
  targetTerminalId: string;
  data: CableData;
}

function getInternalNodeConnections(node: AppNode): Array<[string, string]> {
  const component = node.data;

  if (component.type === 'breaker') {
    const breaker = component as BreakerComponent;
    if (breaker.isClosed && !breaker.isTripped) {
      return [
        ['term-l-in', 'term-l-out'],
        ['term-n-in', 'term-n-out'],
      ];
    }
    return [];
  }

  if (component.type === 'switch') {
    const sw = component as SwitchComponent;
    if (sw.switchType === 'single_pole') {
      if (sw.position === 'closed') {
        return [['term-sw-in', 'term-sw-out']];
      }
      return [];
    }

    if (sw.switchType === 'two_way') {
      if (sw.position === 'pos_1') {
        return [['term-sw-com', 'term-sw-l1']];
      }
      if (sw.position === 'pos_2') {
        return [['term-sw-com', 'term-sw-l2']];
      }
      return [];
    }

    if (sw.switchType === 'intermediate') {
      if (sw.position === 'straight') {
        return [
          ['term-cr-in1', 'term-cr-out1'],
          ['term-cr-in2', 'term-cr-out2'],
        ];
      }
      if (sw.position === 'crossed') {
        return [
          ['term-cr-in1', 'term-cr-out2'],
          ['term-cr-in2', 'term-cr-out1'],
        ];
      }
      return [];
    }

    if (sw.switchType === 'pushbutton') {
      if (sw.isPressed) {
        return [['term-pb-in', 'term-pb-out']];
      }
      return [];
    }
  }

  if (component.type === 'junction') {
    const terminalIds = component.terminals.map((t) => t.id);
    const internalPairs: Array<[string, string]> = [];
    for (let i = 0; i < terminalIds.length; i++) {
      for (let j = i + 1; j < terminalIds.length; j++) {
        internalPairs.push([terminalIds[i], terminalIds[j]]);
      }
    }
    return internalPairs;
  }

  return [];
}

export function simulateElectricalCircuit(nodes: AppNode[], edges: AppEdge[]): SimulationResult {
  const energizedNodeIds = new Set<string>();
  const activeLoadIds = new Set<string>();
  const energizedEdgeIds = new Set<string>();
  const activeEdgeIds = new Set<string>();
  const shortCircuitEdgeIds = new Set<string>();
  const trippedBreakerIds = new Set<string>();
  const nodeStates = new Map<string, Partial<AnyElectricalComponent>>();

  const nodeMap = new Map<string, AppNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const normalizedEdges: InternalEdge[] = edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    sourceTerminalId: e.sourceHandle || '',
    targetNodeId: e.target,
    targetTerminalId: e.targetHandle || '',
    data: (e.data as CableData) || {
      wireType: 'phase',
      crossSectionMm2: 2.5,
      maxAllowedCurrentAmps: 20,
      hasCurrent: false,
      isEnergized: false,
      isShortCircuited: false,
    },
  }));

  const terminalAdj = new Map<string, Array<{ to: GraphTerminalRef; edgeId?: string }>>();

  function getTermKey(nodeId: string, terminalId: string): string {
    return `${nodeId}::${terminalId}`;
  }

  function addTerminalEdge(
    n1: string,
    t1: string,
    n2: string,
    t2: string,
    edgeId?: string
  ): void {
    const k1 = getTermKey(n1, t1);
    const k2 = getTermKey(n2, t2);

    if (!terminalAdj.has(k1)) terminalAdj.set(k1, []);
    if (!terminalAdj.has(k2)) terminalAdj.set(k2, []);

    terminalAdj.get(k1)!.push({ to: { nodeId: n2, terminalId: t2 }, edgeId });
    terminalAdj.get(k2)!.push({ to: { nodeId: n1, terminalId: t1 }, edgeId });
  }

  for (const edge of normalizedEdges) {
    addTerminalEdge(
      edge.sourceNodeId,
      edge.sourceTerminalId,
      edge.targetNodeId,
      edge.targetTerminalId,
      edge.id
    );
  }

  for (const node of nodes) {
    const internalPairs = getInternalNodeConnections(node);
    for (const [t1, t2] of internalPairs) {
      addTerminalEdge(node.id, t1, node.id, t2);
    }
  }

  const phaseSources: GraphTerminalRef[] = [];
  const neutralSources: GraphTerminalRef[] = [];
  const groundSources: GraphTerminalRef[] = [];

  for (const node of nodes) {
    if (node.data.type === 'source') {
      const src = node.data as PowerSourceComponent;
      if (src.isPowered) {
        energizedNodeIds.add(node.id);
        phaseSources.push({ nodeId: node.id, terminalId: 'term-src-l' });
        neutralSources.push({ nodeId: node.id, terminalId: 'term-src-n' });
        groundSources.push({ nodeId: node.id, terminalId: 'term-src-pe' });
      }
    }
  }

  const energizedTerminals = new Set<string>();
  const queuePhase: Array<{ node: GraphTerminalRef; pathEdges: string[] }> = [];

  for (const ps of phaseSources) {
    const key = getTermKey(ps.nodeId, ps.terminalId);
    energizedTerminals.add(key);
    queuePhase.push({ node: ps, pathEdges: [] });
  }

  const edgePredecessors = new Map<string, string[]>();

  while (queuePhase.length > 0) {
    const { node: curr, pathEdges } = queuePhase.shift()!;
    energizedNodeIds.add(curr.nodeId);
    const currKey = getTermKey(curr.nodeId, curr.terminalId);

    const neighbors = terminalAdj.get(currKey) || [];
    for (const neighbor of neighbors) {
      const nextKey = getTermKey(neighbor.to.nodeId, neighbor.to.terminalId);
      const targetNode = nodeMap.get(neighbor.to.nodeId);

      const nextEdges = neighbor.edgeId ? [...pathEdges, neighbor.edgeId] : pathEdges;
      if (neighbor.edgeId) {
        energizedEdgeIds.add(neighbor.edgeId);
        if (!edgePredecessors.has(nextKey)) {
          edgePredecessors.set(nextKey, nextEdges);
        }
      }

      if (!energizedTerminals.has(nextKey)) {
        energizedTerminals.add(nextKey);
        queuePhase.push({ node: neighbor.to, pathEdges: nextEdges });
      }
    }
  }

  const neutralConnectedTerminals = new Set<string>();
  const queueNeutral: GraphTerminalRef[] = [];

  for (const ns of neutralSources) {
    const key = getTermKey(ns.nodeId, ns.terminalId);
    neutralConnectedTerminals.add(key);
    queueNeutral.push(ns);
  }

  while (queueNeutral.length > 0) {
    const curr = queueNeutral.shift()!;
    const currKey = getTermKey(curr.nodeId, curr.terminalId);

    const neighbors = terminalAdj.get(currKey) || [];
    for (const neighbor of neighbors) {
      const nextKey = getTermKey(neighbor.to.nodeId, neighbor.to.terminalId);

      if (!neutralConnectedTerminals.has(nextKey)) {
        neutralConnectedTerminals.add(nextKey);
        queueNeutral.push(neighbor.to);
      }
    }
  }

  const groundConnectedTerminals = new Set<string>();
  const queueGround: GraphTerminalRef[] = [];

  for (const gs of groundSources) {
    const key = getTermKey(gs.nodeId, gs.terminalId);
    groundConnectedTerminals.add(key);
    queueGround.push(gs);
  }

  while (queueGround.length > 0) {
    const curr = queueGround.shift()!;
    const currKey = getTermKey(curr.nodeId, curr.terminalId);

    const neighbors = terminalAdj.get(currKey) || [];
    for (const neighbor of neighbors) {
      const nextKey = getTermKey(neighbor.to.nodeId, neighbor.to.terminalId);

      if (!groundConnectedTerminals.has(nextKey)) {
        groundConnectedTerminals.add(nextKey);
        queueGround.push(neighbor.to);
      }
    }
  }

  let directShortCircuit = false;

  for (const ns of neutralSources) {
    const neutralSourceKey = getTermKey(ns.nodeId, ns.terminalId);
    if (energizedTerminals.has(neutralSourceKey)) {
      directShortCircuit = true;
      const badEdges = edgePredecessors.get(neutralSourceKey) || [];
      for (const eId of badEdges) {
        shortCircuitEdgeIds.add(eId);
      }
    }
  }

  for (const gs of groundSources) {
    const groundSourceKey = getTermKey(gs.nodeId, gs.terminalId);
    if (energizedTerminals.has(groundSourceKey)) {
      directShortCircuit = true;
      const badEdges = edgePredecessors.get(groundSourceKey) || [];
      for (const eId of badEdges) {
        shortCircuitEdgeIds.add(eId);
      }
    }
  }

  if (directShortCircuit) {
    for (const node of nodes) {
      if (node.data.type === 'breaker') {
        const breaker = node.data as BreakerComponent;
        if (breaker.isClosed && !breaker.isTripped) {
          trippedBreakerIds.add(node.id);
          nodeStates.set(node.id, {
            isTripped: true,
            isClosed: false,
            tripReason: 'Disparo magnético por cortocircuito directo L-N / L-PE',
            status: 'tripped',
          });
        }
      }
    }
  }

  for (const node of nodes) {
    if (node.data.type === 'load') {
      const load = node.data as LoadComponent;
      const lKey = getTermKey(node.id, 'term-load-l');
      const nKey = getTermKey(node.id, 'term-load-n');

      const isPhaseEnergized = energizedTerminals.has(lKey);
      const isNeutralPresent = neutralConnectedTerminals.has(nKey);

      const isCircuitClosed = isPhaseEnergized && isNeutralPresent && !directShortCircuit;

      if (isCircuitClosed) {
        activeLoadIds.add(node.id);
        nodeStates.set(node.id, {
          isOn: true,
          status: 'active',
          currentDrawAmps: Number((load.ratedPowerWatts / 230).toFixed(2)),
          isEnergized: true,
        });

        const loadPhaseEdges = edgePredecessors.get(lKey) || [];
        for (const eId of loadPhaseEdges) {
          activeEdgeIds.add(eId);
        }

        const neutralPathEdges = findPathEdges(
          getTermKey(node.id, 'term-load-n'),
          neutralSources.map((s) => getTermKey(s.nodeId, s.terminalId)),
          terminalAdj
        );
        for (const eId of neutralPathEdges) {
          activeEdgeIds.add(eId);
        }
      } else {
        nodeStates.set(node.id, {
          isOn: false,
          status: isPhaseEnergized ? 'warning' : 'normal',
          currentDrawAmps: 0,
          isEnergized: isPhaseEnergized,
        });
      }
    }
  }

  return {
    energizedNodeIds,
    activeLoadIds,
    energizedEdgeIds,
    activeEdgeIds,
    shortCircuitEdgeIds,
    hasShortCircuit: directShortCircuit,
    trippedBreakerIds,
    nodeStates,
  };
}

function findPathEdges(
  startKey: string,
  targetKeys: string[],
  adj: Map<string, Array<{ to: GraphTerminalRef; edgeId?: string }>>
): string[] {
  const targetSet = new Set(targetKeys);
  const visited = new Set<string>([startKey]);
  const queue: Array<{ key: string; edges: string[] }> = [{ key: startKey, edges: [] }];

  while (queue.length > 0) {
    const { key, edges } = queue.shift()!;
    if (targetSet.has(key)) {
      return edges;
    }

    const neighbors = adj.get(key) || [];
    for (const neighbor of neighbors) {
      const nextKey = `${neighbor.to.nodeId}::${neighbor.to.terminalId}`;
      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push({
          key: nextKey,
          edges: neighbor.edgeId ? [...edges, neighbor.edgeId] : edges,
        });
      }
    }
  }

  return [];
}
