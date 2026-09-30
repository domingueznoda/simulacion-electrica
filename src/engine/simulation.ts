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

function getSwitchInternalConnections(sw: SwitchComponent): Array<[string, string]> {
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

  return [];
}

function getInternalZeroOhmConnections(
  node: AppNode,
  excludedBreakerIds: Set<string>
): Array<[string, string]> {
  const comp = node.data;

  if (comp.type === 'breaker') {
    if (excludedBreakerIds.has(node.id)) return [];
    const breaker = comp as BreakerComponent;
    if (breaker.isClosed && !breaker.isTripped) {
      return [
        ['term-l-in', 'term-l-out'],
        ['term-n-in', 'term-n-out'],
      ];
    }
    return [];
  }

  if (comp.type === 'switch') {
    return getSwitchInternalConnections(comp as SwitchComponent);
  }

  if (comp.type === 'junction') {
    const termIds = comp.terminals.map((t) => t.id);
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < termIds.length; i++) {
      for (let j = i + 1; j < termIds.length; j++) {
        pairs.push([termIds[i], termIds[j]]);
      }
    }
    return pairs;
  }

  return [];
}

interface Net {
  id: number;
  terminals: Set<string>;
  edgeIds: Set<string>;
  hasPhase: boolean;
  hasNeutral: boolean;
  hasGround: boolean;
}

interface LoadBranch {
  nodeId: string;
  netA: Net;
  netB: Net;
  resistance: number;
  nominalPower: number;
}

interface CircuitPath {
  pathKey: string;
  nets: number[];
  branches: LoadBranch[];
  totalResistance: number;
  current: number;
}

interface NetworkEvaluation {
  nets: Net[];
  termToNetMap: Map<string, Net>;
  directShortCircuit: boolean;
  shortCircuitEdgeIds: Set<string>;
  validPaths: CircuitPath[];
}

function termKey(nodeId: string, terminalId: string): string {
  return `${nodeId}::${terminalId}`;
}

function evaluateNetwork(
  nodes: AppNode[],
  edges: AppEdge[],
  excludedBreakerIds: Set<string>
): NetworkEvaluation {
  const nodeMap = new Map<string, AppNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const zeroAdj = new Map<string, Array<{ toKey: string; edgeId?: string }>>();

  function addZeroEdge(k1: string, k2: string, edgeId?: string) {
    if (!zeroAdj.has(k1)) zeroAdj.set(k1, []);
    if (!zeroAdj.has(k2)) zeroAdj.set(k2, []);
    zeroAdj.get(k1)!.push({ toKey: k2, edgeId });
    zeroAdj.get(k2)!.push({ toKey: k1, edgeId });
  }

  for (const e of edges) {
    if (e.source && e.target && e.sourceHandle && e.targetHandle) {
      addZeroEdge(termKey(e.source, e.sourceHandle), termKey(e.target, e.targetHandle), e.id);
    }
  }

  for (const node of nodes) {
    const pairs = getInternalZeroOhmConnections(node, excludedBreakerIds);
    for (const [t1, t2] of pairs) {
      addZeroEdge(termKey(node.id, t1), termKey(node.id, t2));
    }
  }

  const allTerminals = new Set<string>();
  for (const node of nodes) {
    for (const t of node.data.terminals || []) {
      allTerminals.add(termKey(node.id, t.id));
    }
    if (node.data.type === 'load') {
      allTerminals.add(termKey(node.id, 'term-load-l'));
      allTerminals.add(termKey(node.id, 'term-load-n'));
    }
    if (node.data.type === 'source') {
      allTerminals.add(termKey(node.id, 'term-src-l'));
      allTerminals.add(termKey(node.id, 'term-src-n'));
      allTerminals.add(termKey(node.id, 'term-src-pe'));
    }
  }
  for (const k of zeroAdj.keys()) {
    allTerminals.add(k);
  }

  const termToNetMap = new Map<string, Net>();
  const nets: Net[] = [];
  const visitedTerms = new Set<string>();

  for (const startTerm of allTerminals) {
    if (visitedTerms.has(startTerm)) continue;

    const net: Net = {
      id: nets.length,
      terminals: new Set<string>(),
      edgeIds: new Set<string>(),
      hasPhase: false,
      hasNeutral: false,
      hasGround: false,
    };

    const queue: string[] = [startTerm];
    visitedTerms.add(startTerm);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      net.terminals.add(curr);
      termToNetMap.set(curr, net);

      const [nId, tId] = curr.split('::');
      const node = nodeMap.get(nId);
      if (node && node.data.type === 'source') {
        const src = node.data as PowerSourceComponent;
        if (src.isPowered) {
          if (tId === 'term-src-l') net.hasPhase = true;
          if (tId === 'term-src-n') net.hasNeutral = true;
          if (tId === 'term-src-pe') net.hasGround = true;
        }
      }

      const neighbors = zeroAdj.get(curr) || [];
      for (const n of neighbors) {
        if (n.edgeId) {
          net.edgeIds.add(n.edgeId);
        }
        if (!visitedTerms.has(n.toKey)) {
          visitedTerms.add(n.toKey);
          queue.push(n.toKey);
        }
      }
    }

    nets.push(net);
  }

  let directShortCircuit = false;
  const shortCircuitEdgeIds = new Set<string>();

  for (const net of nets) {
    if ((net.hasPhase && net.hasNeutral) || (net.hasPhase && net.hasGround)) {
      directShortCircuit = true;
      for (const edgeId of net.edgeIds) {
        shortCircuitEdgeIds.add(edgeId);
      }
    }
  }

  if (directShortCircuit) {
    return {
      nets,
      termToNetMap,
      directShortCircuit: true,
      shortCircuitEdgeIds,
      validPaths: [],
    };
  }

  const loadBranches: LoadBranch[] = [];

  for (const node of nodes) {
    if (node.data.type === 'load') {
      const load = node.data as LoadComponent;
      const kA = termKey(node.id, 'term-load-l');
      const kB = termKey(node.id, 'term-load-n');

      const netA = termToNetMap.get(kA);
      const netB = termToNetMap.get(kB);

      if (netA && netB && netA.id !== netB.id) {
        const p = Math.max(load.ratedPowerWatts || 15, 1);
        const r = (230 * 230) / p;
        loadBranches.push({
          nodeId: node.id,
          netA,
          netB,
          resistance: r,
          nominalPower: p,
        });
      }
    }
  }

  const netGraph = new Map<number, Array<{ toNetId: number; branch: LoadBranch }>>();
  for (const lb of loadBranches) {
    const idA = lb.netA.id;
    const idB = lb.netB.id;
    if (!netGraph.has(idA)) netGraph.set(idA, []);
    if (!netGraph.has(idB)) netGraph.set(idB, []);
    netGraph.get(idA)!.push({ toNetId: idB, branch: lb });
    netGraph.get(idB)!.push({ toNetId: idA, branch: lb });
  }

  const phaseNetIds = new Set<number>();
  const neutralNetIds = new Set<number>();
  for (const net of nets) {
    if (net.hasPhase) phaseNetIds.add(net.id);
    if (net.hasNeutral) neutralNetIds.add(net.id);
  }

  const validPaths: CircuitPath[] = [];

  function dfsPaths(
    currNetId: number,
    visitedNetIds: Set<number>,
    pathNets: number[],
    pathBranches: LoadBranch[],
    accR: number
  ) {
    if (neutralNetIds.has(currNetId)) {
      const current = 230 / Math.max(accR, 1);
      const branchKey = pathBranches.map((b) => b.nodeId).sort().join('->');
      validPaths.push({
        pathKey: `${pathNets[0]}::${branchKey}::${currNetId}`,
        nets: [...pathNets],
        branches: [...pathBranches],
        totalResistance: accR,
        current,
      });
      return;
    }

    if (pathBranches.length >= 8) return;

    const neighbors = netGraph.get(currNetId) || [];
    for (const nb of neighbors) {
      if (!visitedNetIds.has(nb.toNetId)) {
        visitedNetIds.add(nb.toNetId);
        pathNets.push(nb.toNetId);
        pathBranches.push(nb.branch);

        dfsPaths(nb.toNetId, visitedNetIds, pathNets, pathBranches, accR + nb.branch.resistance);

        pathBranches.pop();
        pathNets.pop();
        visitedNetIds.delete(nb.toNetId);
      }
    }
  }

  for (const pNetId of phaseNetIds) {
    const visited = new Set<number>([pNetId]);
    dfsPaths(pNetId, visited, [pNetId], [], 0);
  }

  return {
    nets,
    termToNetMap,
    directShortCircuit: false,
    shortCircuitEdgeIds,
    validPaths,
  };
}

export function simulateElectricalCircuit(nodes: AppNode[], edges: AppEdge[]): SimulationResult {
  const energizedNodeIds = new Set<string>();
  const activeLoadIds = new Set<string>();
  const energizedEdgeIds = new Set<string>();
  const activeEdgeIds = new Set<string>();
  const shortCircuitEdgeIds = new Set<string>();
  const trippedBreakerIds = new Set<string>();
  const nodeStates = new Map<string, Partial<AnyElectricalComponent>>();

  const baseEval = evaluateNetwork(nodes, edges, new Set<string>());

  if (baseEval.directShortCircuit) {
    for (const node of nodes) {
      if (node.data.type === 'breaker') {
        const brk = node.data as BreakerComponent;
        if (brk.isClosed && !brk.isTripped) {
          trippedBreakerIds.add(node.id);
          nodeStates.set(node.id, {
            isTripped: true,
            isClosed: false,
            tripReason: 'Disparo magnético por cortocircuito directo L-N / L-PE',
            status: 'tripped',
            measuredCurrentAmps: 0,
          });
        }
      }
    }

    for (const net of baseEval.nets) {
      if (net.hasPhase) {
        for (const edgeId of net.edgeIds) {
          energizedEdgeIds.add(edgeId);
        }
        for (const t of net.terminals) {
          const [nId] = t.split('::');
          energizedNodeIds.add(nId);
        }
      }
    }

    return {
      energizedNodeIds,
      activeLoadIds,
      energizedEdgeIds,
      activeEdgeIds,
      shortCircuitEdgeIds: baseEval.shortCircuitEdgeIds,
      hasShortCircuit: true,
      trippedBreakerIds,
      nodeStates,
    };
  }

  const closedBreakerNodes = nodes.filter(
    (n) => n.data.type === 'breaker' && (n.data as BreakerComponent).isClosed && !(n.data as BreakerComponent).isTripped
  );

  const breakerCurrents = new Map<string, number>();
  const newlyTrippedBreakerIds = new Set<string>();

  for (const bNode of closedBreakerNodes) {
    const brk = bNode.data as BreakerComponent;
    const withoutEval = evaluateNetwork(nodes, edges, new Set<string>([bNode.id]));
    const survivingKeys = new Set(withoutEval.validPaths.map((p) => p.pathKey));

    let currentThroughBreaker = 0;
    for (const path of baseEval.validPaths) {
      if (!survivingKeys.has(path.pathKey)) {
        currentThroughBreaker += path.current;
      }
    }

    const currentRounded = Number(currentThroughBreaker.toFixed(2));
    breakerCurrents.set(bNode.id, currentRounded);

    if (currentRounded > brk.ratedCurrent + 0.05) {
      newlyTrippedBreakerIds.add(bNode.id);
      trippedBreakerIds.add(bNode.id);
      nodeStates.set(bNode.id, {
        isTripped: true,
        isClosed: false,
        status: 'tripped',
        tripReason: `Disparo térmico por sobrecarga: corriente circulante (${currentRounded.toFixed(1)}A) supera el calibre nominal (${brk.ratedCurrent}A)`,
        measuredCurrentAmps: currentRounded,
      });
    } else {
      nodeStates.set(bNode.id, {
        measuredCurrentAmps: currentRounded,
      });
    }
  }

  const finalEval =
    newlyTrippedBreakerIds.size > 0
      ? evaluateNetwork(nodes, edges, newlyTrippedBreakerIds)
      : baseEval;

  const activeBranchMap = new Map<
    string,
    { branch: LoadBranch; pathLength: number; voltage: number; current: number }
  >();
  const participatingNetIds = new Set<number>();

  for (const path of finalEval.validPaths) {
    for (const netId of path.nets) {
      participatingNetIds.add(netId);
    }

    for (const b of path.branches) {
      const vDrop = path.current * b.resistance;
      activeBranchMap.set(b.nodeId, {
        branch: b,
        pathLength: path.branches.length,
        voltage: Math.min(230, Math.round(vDrop)),
        current: Number(path.current.toFixed(2)),
      });
    }
  }

  for (const [nodeId, info] of activeBranchMap.entries()) {
    activeLoadIds.add(nodeId);
    const isSeries = info.pathLength > 1;

    nodeStates.set(nodeId, {
      isOn: true,
      status: 'active',
      isEnergized: true,
      isSeries,
      voltageDropVolts: info.voltage,
      currentDrawAmps: info.current,
    });
  }

  for (const net of finalEval.nets) {
    const isNetPhaseEnergized = net.hasPhase || participatingNetIds.has(net.id);
    if (isNetPhaseEnergized) {
      for (const t of net.terminals) {
        const [nId] = t.split('::');
        energizedNodeIds.add(nId);
      }
      for (const eId of net.edgeIds) {
        energizedEdgeIds.add(eId);
      }
    }

    if (participatingNetIds.has(net.id)) {
      for (const eId of net.edgeIds) {
        activeEdgeIds.add(eId);
      }
    }
  }

  for (const node of nodes) {
    if (node.data.type === 'load' && !activeLoadIds.has(node.id)) {
      const kA = termKey(node.id, 'term-load-l');
      const kB = termKey(node.id, 'term-load-n');
      const netA = finalEval.termToNetMap.get(kA);
      const netB = finalEval.termToNetMap.get(kB);

      const hasPhase = Boolean((netA && netA.hasPhase) || (netB && netB.hasPhase));
      const hasNeutral = Boolean((netA && netA.hasNeutral) || (netB && netB.hasNeutral));

      const isEnergized = hasPhase;
      const status = hasPhase && !hasNeutral ? 'warning' : 'normal';

      nodeStates.set(node.id, {
        isOn: false,
        status,
        currentDrawAmps: 0,
        isEnergized,
        isSeries: false,
        voltageDropVolts: 0,
        hasPhaseContact: hasPhase,
        hasNeutralContact: hasNeutral,
      });

      if (isEnergized) {
        energizedNodeIds.add(node.id);
      }
    }
  }

  return {
    energizedNodeIds,
    activeLoadIds,
    energizedEdgeIds,
    activeEdgeIds,
    shortCircuitEdgeIds: finalEval.shortCircuitEdgeIds,
    hasShortCircuit: false,
    trippedBreakerIds,
    nodeStates,
  };
}
