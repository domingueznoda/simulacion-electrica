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

interface ZeroOhmConnection {
  t1: GraphTerminalRef;
  t2: GraphTerminalRef;
  edgeId?: string;
}

function getSwitchInternalConnections(sw: SwitchComponent, nodeId: string): Array<[string, string]> {
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

function getInternalZeroOhmConnections(node: AppNode): Array<[string, string]> {
  const comp = node.data;

  if (comp.type === 'breaker') {
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
    return getSwitchInternalConnections(comp as SwitchComponent, node.id);
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

  function termKey(nodeId: string, terminalId: string): string {
    return `${nodeId}::${terminalId}`;
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
    const pairs = getInternalZeroOhmConnections(node);
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
  for (const net of nets) {
    if ((net.hasPhase && net.hasNeutral) || (net.hasPhase && net.hasGround)) {
      directShortCircuit = true;
      for (const edgeId of net.edgeIds) {
        shortCircuitEdgeIds.add(edgeId);
      }
    }
  }

  if (directShortCircuit) {
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
          });
        }
      }
    }

    for (const net of nets) {
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
      shortCircuitEdgeIds,
      hasShortCircuit: true,
      trippedBreakerIds,
      nodeStates,
    };
  }

  interface LoadBranch {
    nodeId: string;
    netA: Net;
    netB: Net;
    resistance: number;
    nominalPower: number;
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

  interface SimplePath {
    nets: number[];
    branches: LoadBranch[];
    totalResistance: number;
  }

  const validPaths: SimplePath[] = [];

  function dfsPaths(currNetId: number, visitedNetIds: Set<number>, pathNets: number[], pathBranches: LoadBranch[], accR: number) {
    if (neutralNetIds.has(currNetId)) {
      validPaths.push({
        nets: [...pathNets],
        branches: [...pathBranches],
        totalResistance: accR,
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

  const activeBranchMap = new Map<string, { branch: LoadBranch; pathLength: number; voltage: number; current: number }>();
  const participatingNetIds = new Set<number>();

  for (const path of validPaths) {
    const current = 230 / Math.max(path.totalResistance, 1);
    for (const netId of path.nets) {
      participatingNetIds.add(netId);
    }

    for (const b of path.branches) {
      const vDrop = current * b.resistance;
      activeBranchMap.set(b.nodeId, {
        branch: b,
        pathLength: path.branches.length,
        voltage: Math.min(230, Math.round(vDrop)),
        current: Number(current.toFixed(2)),
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

  for (const net of nets) {
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
      const netA = termToNetMap.get(kA);
      const netB = termToNetMap.get(kB);

      const hasPhaseContact = (netA && (netA.hasPhase || participatingNetIds.has(netA.id))) ||
                              (netB && (netB.hasPhase || participatingNetIds.has(netB.id)));

      nodeStates.set(node.id, {
        isOn: false,
        status: hasPhaseContact ? 'warning' : 'normal',
        currentDrawAmps: 0,
        isEnergized: Boolean(hasPhaseContact),
        isSeries: false,
        voltageDropVolts: 0,
      });

      if (hasPhaseContact) {
        energizedNodeIds.add(node.id);
      }
    }
  }

  return {
    energizedNodeIds,
    activeLoadIds,
    energizedEdgeIds,
    activeEdgeIds,
    shortCircuitEdgeIds,
    hasShortCircuit: false,
    trippedBreakerIds,
    nodeStates,
  };
}
