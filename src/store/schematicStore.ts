import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type {
  AnyElectricalComponent,
  AppEdge,
  AppNode,
  BreakerComponent,
  CableData,
  ComponentType,
  PowerSourceComponent,
  SchematicStore,
  SwitchComponent,
  Terminal,
  WireType,
} from '../types/electrical';
import { simulateElectricalCircuit } from '../engine/simulation';
import { validateElectricalSchematic } from '../engine/validation';
import { PRESET_CIRCUITS } from '../engine/presets';

function createDefaultTerminals(type: ComponentType, subType?: string): Terminal[] {
  if (type === 'source') {
    return [
      { id: 'term-src-l', name: 'L (Fase)', role: 'phase_out', polarity: 'L', isEnergized: true, potential: 230 },
      { id: 'term-src-n', name: 'N (Neutro)', role: 'neutral_out', polarity: 'N', isEnergized: false, potential: 0 },
      { id: 'term-src-pe', name: 'PE (Tierra)', role: 'ground', polarity: 'PE', isEnergized: false, potential: 0 },
    ];
  }

  if (type === 'breaker') {
    return [
      { id: 'term-l-in', name: 'L Entrada', role: 'phase_in', polarity: 'L', isEnergized: false, potential: 0 },
      { id: 'term-l-out', name: 'L Salida', role: 'phase_out', polarity: 'L', isEnergized: false, potential: 0 },
      { id: 'term-n-in', name: 'N Entrada', role: 'neutral_in', polarity: 'N', isEnergized: false, potential: 0 },
      { id: 'term-n-out', name: 'N Salida', role: 'neutral_out', polarity: 'N', isEnergized: false, potential: 0 },
    ];
  }

  if (type === 'switch') {
    if (subType === 'two_way') {
      return [
        { id: 'term-sw-com', name: 'Común', role: 'common', polarity: 'L', isEnergized: false, potential: 0 },
        { id: 'term-sw-l1', name: 'Viajero 1', role: 'traveler_1', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
        { id: 'term-sw-l2', name: 'Viajero 2', role: 'traveler_2', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
      ];
    }
    if (subType === 'intermediate') {
      return [
        { id: 'term-cr-in1', name: 'Entrada 1', role: 'in', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
        { id: 'term-cr-in2', name: 'Entrada 2', role: 'in', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
        { id: 'term-cr-out1', name: 'Salida 1', role: 'out', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
        { id: 'term-cr-out2', name: 'Salida 2', role: 'out', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
      ];
    }
    if (subType === 'pushbutton') {
      return [
        { id: 'term-pb-in', name: 'Entrada Pulsador', role: 'in', polarity: 'L', isEnergized: false, potential: 0 },
        { id: 'term-pb-out', name: 'Salida Pulsador', role: 'out', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
      ];
    }
    return [
      { id: 'term-sw-in', name: 'L Entrada', role: 'in', polarity: 'L', isEnergized: false, potential: 0 },
      { id: 'term-sw-out', name: 'L Vuelta', role: 'out', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
    ];
  }

  if (type === 'load') {
    return [
      { id: 'term-load-l', name: 'Fase (L)', role: 'phase_in', polarity: 'L', isEnergized: false, potential: 0 },
      { id: 'term-load-n', name: 'Neutro (N)', role: 'neutral_in', polarity: 'N', isEnergized: false, potential: 0 },
    ];
  }

  if (type === 'junction') {
    return [
      { id: 'term-j-1', name: 'Borna 1', role: 'universal', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
      { id: 'term-j-2', name: 'Borna 2', role: 'universal', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
      { id: 'term-j-3', name: 'Borna 3', role: 'universal', polarity: 'VARIABLE', isEnergized: false, potential: 0 },
    ];
  }

  return [];
}

function determineWireType(sourceHandle: string, targetHandle: string): WireType {
  const handles = `${sourceHandle}::${targetHandle}`.toLowerCase();
  if (handles.includes('pe') || handles.includes('ground')) return 'ground';
  if (handles.includes('src-n') || handles.includes('term-n') || handles.includes('load-n')) return 'neutral';
  if (handles.includes('term-sw-l1') || handles.includes('term-sw-l2') || handles.includes('cr-')) return 'traveler';
  if (handles.includes('term-sw-out') || handles.includes('term-pb-out')) return 'switched_phase';
  return 'phase';
}

function evaluateGraphState(nodes: AppNode[], edges: AppEdge[]) {
  const simResult = simulateElectricalCircuit(nodes, edges);

  const updatedNodes = nodes.map((node) => {
    const dynamicOverrides = simResult.nodeStates.get(node.id);
    const isEnergized = simResult.energizedNodeIds.has(node.id);

    return {
      ...node,
      data: {
        ...node.data,
        isEnergized,
        ...(dynamicOverrides || {}),
      },
    } as AppNode;
  });

  const updatedEdges = edges.map((edge) => {
    const isEnergized = simResult.energizedEdgeIds.has(edge.id);
    const hasCurrent = simResult.activeEdgeIds.has(edge.id);
    const isShortCircuited = simResult.shortCircuitEdgeIds.has(edge.id);

    return {
      ...edge,
      data: {
        ...edge.data,
        isEnergized,
        hasCurrent,
        isShortCircuited,
      } as CableData,
    };
  });

  const validationErrors = validateElectricalSchematic(
    updatedNodes,
    updatedEdges,
    simResult
  );

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
    validationErrors,
    hasShortCircuit: simResult.hasShortCircuit,
  };
}

export const useSchematicStore = create<SchematicStore>()(
  persist(
    (set, get) => {
      const initialPreset = PRESET_CIRCUITS.two_way_switch;
      const initialEval = evaluateGraphState(initialPreset.nodes, initialPreset.edges);

      return {
        nodes: initialEval.nodes,
        edges: initialEval.edges,
        selectedNodeId: null,
        validationErrors: initialEval.validationErrors,
        isSimulating: true,
        hasShortCircuit: initialEval.hasShortCircuit,
        activePreset: 'two_way_switch',

        setNodes: (nodes) => {
          const evalState = evaluateGraphState(nodes, get().edges);
          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        setEdges: (edges) => {
          const evalState = evaluateGraphState(get().nodes, edges);
          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        onNodesChange: (changes) => {
          const nextNodes = applyNodeChanges(changes as unknown as NodeChange<AppNode>[], get().nodes as unknown as AppNode[]) as unknown as AppNode[];
          set({ nodes: nextNodes });
        },

        onEdgesChange: (changes) => {
          const nextEdges = applyEdgeChanges(changes as unknown as EdgeChange<AppEdge>[], get().edges as unknown as AppEdge[]) as unknown as AppEdge[];
          const evalState = evaluateGraphState(get().nodes, nextEdges);
          set({
            edges: evalState.edges,
            nodes: evalState.nodes,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        addNode: (type, subType, position) => {
          const currentNodes = get().nodes;
          const id = `node-${type}-${Date.now().toString(36)}`;
          const pos = position || {
            x: 200 + (currentNodes.length % 5) * 50,
            y: 150 + (currentNodes.length % 4) * 60,
          };

          let nodeData: AnyElectricalComponent;
          let nodeType = 'loadNode';

          if (type === 'source') {
            nodeType = 'sourceNode';
            nodeData = {
              id,
              name: 'Alimentación Red 230V',
              type: 'source',
              voltage: 230,
              frequency: 50,
              isAc: true,
              isPowered: true,
              isEnergized: true,
              status: 'normal',
              terminals: createDefaultTerminals('source'),
            };
          } else if (type === 'breaker') {
            nodeType = 'breakerNode';
            const ratedAmps = subType === '16A' ? 16 : subType === '25A' ? 25 : 10;
            nodeData = {
              id,
              name: `PIA ${ratedAmps}A`,
              type: 'breaker',
              breakerType: 'circuit_breaker',
              ratedCurrent: ratedAmps,
              curve: 'C',
              breakingCapacityKa: 6,
              isClosed: true,
              isTripped: false,
              isEnergized: false,
              status: 'normal',
              terminals: createDefaultTerminals('breaker'),
            };
          } else if (type === 'switch') {
            nodeType = 'switchNode';
            const st = (subType as SwitchComponent['switchType']) || 'single_pole';
            const names: Record<string, string> = {
              single_pole: 'Interruptor Unipolar',
              two_way: 'Conmutador',
              intermediate: 'Cruzamiento',
              pushbutton: 'Pulsador Timbre',
            };
            nodeData = {
              id,
              name: names[st] || 'Interruptor',
              type: 'switch',
              switchType: st,
              position: st === 'single_pole' ? 'open' : st === 'two_way' ? 'pos_1' : 'straight',
              isPressed: false,
              isEnergized: false,
              status: 'normal',
              terminals: createDefaultTerminals('switch', st),
            };
          } else if (type === 'junction') {
            nodeType = 'junctionNode';
            nodeData = {
              id,
              name: 'Caja Borna WAGO',
              type: 'junction',
              junctionType: 'wago_3',
              pole: 'universal',
              isEnergized: false,
              status: 'normal',
              terminals: createDefaultTerminals('junction'),
            };
          } else {
            nodeType = 'loadNode';
            const lt = (subType as 'lamp' | 'socket' | 'buzzer' | 'motor') || 'lamp';
            const loadConfigs: Record<string, { name: string; watts: number }> = {
              lamp: { name: 'Lámpara LED', watts: 15 },
              socket: { name: 'Toma Corriente 16A', watts: 500 },
              buzzer: { name: 'Timbre Avisador', watts: 10 },
              motor: { name: 'Extractor / Ventilador', watts: 80 },
            };
            const config = loadConfigs[lt] || { name: 'Carga Eléctrica', watts: 60 };
            nodeData = {
              id,
              name: config.name,
              type: 'load',
              loadType: lt,
              ratedPowerWatts: config.watts,
              nominalVoltage: 230,
              isOn: false,
              currentDrawAmps: 0,
              isEnergized: false,
              status: 'normal',
              terminals: createDefaultTerminals('load'),
            };
          }

          const newNode: AppNode = {
            id,
            type: nodeType,
            position: pos,
            data: nodeData,
          };

          const nextNodes = [...currentNodes, newNode];
          const evalState = evaluateGraphState(nextNodes, get().edges);

          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
            selectedNodeId: id,
          });
        },

        removeNode: (id) => {
          const nextNodes = get().nodes.filter((n) => n.id !== id);
          const nextEdges = get().edges.filter((e) => e.source !== id && e.target !== id);
          const evalState = evaluateGraphState(nextNodes, nextEdges);

          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
            selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
          });
        },

        updateNodeData: (id, partialData) => {
          const nextNodes = get().nodes.map((node) => {
            if (node.id !== id) return node;
            return {
              ...node,
              data: {
                ...node.data,
                ...partialData,
              },
            } as AppNode;
          });

          const evalState = evaluateGraphState(nextNodes, get().edges);
          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        connectNodes: (sourceId, targetId, sourceHandle, targetHandle) => {
          if (!sourceId || !targetId || !sourceHandle || !targetHandle) return;
          if (sourceId === targetId) return;

          const exists = get().edges.some(
            (e) =>
              (e.source === sourceId &&
                e.target === targetId &&
                e.sourceHandle === sourceHandle &&
                e.targetHandle === targetHandle) ||
              (e.source === targetId &&
                e.target === sourceId &&
                e.sourceHandle === targetHandle &&
                e.targetHandle === sourceHandle)
          );
          if (exists) return;

          const wireType = determineWireType(sourceHandle, targetHandle);
          const defaultSection = wireType === 'phase' || wireType === 'switched_phase' ? 1.5 : 1.5;

          const newEdge: AppEdge = {
            id: `cable-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            source: sourceId,
            target: targetId,
            sourceHandle,
            targetHandle,
            type: 'electricalEdge',
            data: {
              wireType,
              crossSectionMm2: defaultSection,
              maxAllowedCurrentAmps: 16,
              hasCurrent: false,
              isEnergized: false,
              isShortCircuited: false,
            },
          };

          const nextEdges = [...get().edges, newEdge];
          const evalState = evaluateGraphState(get().nodes, nextEdges);

          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        removeEdge: (id) => {
          const nextEdges = get().edges.filter((e) => e.id !== id);
          const evalState = evaluateGraphState(get().nodes, nextEdges);

          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        updateEdgeData: (id, partialData) => {
          const nextEdges = get().edges.map((e) => {
            if (e.id !== id) return e;
            return {
              ...e,
              data: {
                ...(e.data as CableData),
                ...partialData,
              },
            };
          });

          const evalState = evaluateGraphState(get().nodes, nextEdges);
          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        toggleNodeState: (id) => {
          const currentNodes = get().nodes;
          const targetNode = currentNodes.find((n) => n.id === id);
          if (!targetNode) return;

          const component = targetNode.data;
          let updatedComponent = { ...component };

          if (component.type === 'switch') {
            const sw = component as SwitchComponent;
            if (sw.switchType === 'single_pole') {
              const nextPos = sw.position === 'closed' ? 'open' : 'closed';
              updatedComponent = {
                ...sw,
                position: nextPos,
                status: nextPos === 'closed' ? 'active' : 'normal',
              };
            } else if (sw.switchType === 'two_way') {
              const nextPos = sw.position === 'pos_1' ? 'pos_2' : 'pos_1';
              updatedComponent = {
                ...sw,
                position: nextPos,
              };
            } else if (sw.switchType === 'intermediate') {
              const nextPos = sw.position === 'straight' ? 'crossed' : 'straight';
              updatedComponent = {
                ...sw,
                position: nextPos,
              };
            } else if (sw.switchType === 'pushbutton') {
              updatedComponent = {
                ...sw,
                isPressed: !sw.isPressed,
                status: !sw.isPressed ? 'active' : 'normal',
              };
            }
          } else if (component.type === 'breaker') {
            const brk = component as BreakerComponent;
            if (brk.isTripped) {
              updatedComponent = {
                ...brk,
                isTripped: false,
                isClosed: true,
                status: 'normal',
                tripReason: undefined,
              };
            } else {
              updatedComponent = {
                ...brk,
                isClosed: !brk.isClosed,
                status: !brk.isClosed ? 'normal' : 'warning',
              };
            }
          } else if (component.type === 'source') {
            const src = component as PowerSourceComponent;
            updatedComponent = {
              ...src,
              isPowered: !src.isPowered,
              status: !src.isPowered ? 'normal' : 'warning',
            };
          }

          const nextNodes = currentNodes.map((n) =>
            n.id === id ? ({ ...n, data: updatedComponent } as AppNode) : n
          );

          const evalState = evaluateGraphState(nextNodes, get().edges);

          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        resetBreakers: () => {
          const nextNodes = get().nodes.map((n) => {
            if (n.data.type === 'breaker') {
              const brk = n.data as BreakerComponent;
              return {
                ...n,
                data: {
                  ...brk,
                  isTripped: false,
                  isClosed: true,
                  status: 'normal',
                  tripReason: undefined,
                },
              } as AppNode;
            }
            return n;
          });

          const evalState = evaluateGraphState(nextNodes, get().edges);
          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        runSimulation: () => {
          const evalState = evaluateGraphState(get().nodes, get().edges);
          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
          });
        },

        setSimulating: (active) => {
          set({ isSimulating: active });
          if (active) {
            get().runSimulation();
          }
        },

        setSelectedNodeId: (id) => {
          set({ selectedNodeId: id });
        },

        loadPreset: (presetKey) => {
          const preset = PRESET_CIRCUITS[presetKey];
          if (!preset) return;

          const evalState = evaluateGraphState(preset.nodes, preset.edges);
          set({
            nodes: evalState.nodes,
            edges: evalState.edges,
            validationErrors: evalState.validationErrors,
            hasShortCircuit: evalState.hasShortCircuit,
            activePreset: presetKey,
            selectedNodeId: null,
          });
        },

        clearCanvas: () => {
          set({
            nodes: [],
            edges: [],
            validationErrors: [],
            hasShortCircuit: false,
            selectedNodeId: null,
          });
        },
      };
    },
    {
      name: 'electrosim-schematic-storage-v2',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        activePreset: state.activePreset,
      }),
    }
  )
);
