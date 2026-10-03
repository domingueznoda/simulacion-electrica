import type { Edge, Node } from '@xyflow/react';

export type ComponentType = 'source' | 'breaker' | 'switch' | 'load' | 'junction';

export type ComponentStatus = 'normal' | 'active' | 'tripped' | 'short_circuit' | 'warning';

export type WireType = 'phase' | 'neutral' | 'ground' | 'switched_phase' | 'traveler';

export type TerminalPolarity = 'L' | 'N' | 'PE' | 'VARIABLE';

export type TerminalRole = 
  | 'phase_in' 
  | 'phase_out' 
  | 'neutral_in' 
  | 'neutral_out' 
  | 'ground' 
  | 'common' 
  | 'traveler_1' 
  | 'traveler_2' 
  | 'in' 
  | 'out' 
  | 'universal';

export interface Terminal {
  id: string;
  name: string;
  role: TerminalRole;
  polarity: TerminalPolarity;
  isEnergized: boolean;
  potential: number;
}

export interface ElectricalComponent extends Record<string, unknown> {
  id: string;
  name: string;
  type: ComponentType;
  terminals: Terminal[];
  isEnergized: boolean;
  status: ComponentStatus;
  customProperties?: Record<string, unknown>;
}

export interface PowerSourceComponent extends ElectricalComponent {
  type: 'source';
  voltage: number;
  frequency: number;
  isAc: boolean;
  isPowered: boolean;
}

export type BreakerType = 'circuit_breaker' | 'rcd' | 'iga' | 'pcs' | 'fuse';
export type BreakerCurve = 'B' | 'C' | 'D';

export interface BreakerComponent extends ElectricalComponent {
  type: 'breaker';
  breakerType: BreakerType;
  ratedCurrent: number;
  curve: BreakerCurve;
  breakingCapacityKa: number;
  isClosed: boolean;
  isTripped: boolean;
  tripReason?: string;
  measuredCurrentAmps?: number;
  rcdSensitivityMa?: number;
}

export type SwitchType = 'single_pole' | 'two_way' | 'intermediate' | 'pushbutton';
export type SwitchPosition = 'open' | 'closed' | 'pos_1' | 'pos_2' | 'crossed' | 'straight';

export interface SwitchComponent extends ElectricalComponent {
  type: 'switch';
  switchType: SwitchType;
  position: SwitchPosition;
  isPressed: boolean;
}

export type LoadType = 'lamp' | 'socket' | 'buzzer' | 'motor';

export interface LoadComponent extends ElectricalComponent {
  type: 'load';
  loadType: LoadType;
  ratedPowerWatts: number;
  nominalVoltage: number;
  isOn: boolean;
  currentDrawAmps: number;
  voltageDropVolts?: number;
  isSeries?: boolean;
  hasPhaseContact?: boolean;
  hasNeutralContact?: boolean;
  hasGroundContact?: boolean;
}

export type JunctionType = 'wago_3' | 'wago_5' | 'terminal_strip';
export type JunctionPole = 'phase' | 'neutral' | 'ground' | 'universal';

export interface JunctionComponent extends ElectricalComponent {
  type: 'junction';
  junctionType: JunctionType;
  pole: JunctionPole;
}

export type AnyElectricalComponent =
  | PowerSourceComponent
  | BreakerComponent
  | SwitchComponent
  | LoadComponent
  | JunctionComponent;

export interface CableData extends Record<string, unknown> {
  wireType: WireType;
  crossSectionMm2: number;
  maxAllowedCurrentAmps: number;
  hasCurrent: boolean;
  isEnergized: boolean;
  isShortCircuited: boolean;
  measuredCurrentAmps?: number;
}

export type AppNode = Node<AnyElectricalComponent>;
export type AppEdge = Edge<CableData>;

export type ValidationErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export type ValidationErrorCode =
  | 'SHORT_CIRCUIT'
  | 'EARTH_FAULT'
  | 'UNDERSIZED_CABLE'
  | 'OPEN_CIRCUIT'
  | 'MISSING_NEUTRAL'
  | 'INCOMPATIBLE_POLARITY'
  | 'BREAKER_TRIPPED'
  | 'MISSING_PROTECTION'
  | 'UNUSED_TERMINALS';

export interface ValidationError {
  id: string;
  code: ValidationErrorCode;
  severity: ValidationErrorSeverity;
  title: string;
  message: string;
  nodeIds: string[];
  edgeIds: string[];
  suggestedFix: string;
}

export interface SimulationResult {
  energizedNodeIds: Set<string>;
  activeLoadIds: Set<string>;
  energizedEdgeIds: Set<string>;
  activeEdgeIds: Set<string>;
  edgeCurrents?: Map<string, number>;
  shortCircuitEdgeIds: Set<string>;
  hasShortCircuit: boolean;
  trippedBreakerIds: Set<string>;
  nodeStates: Map<string, Partial<AnyElectricalComponent>>;
}

export interface SchematicStore {
  nodes: AppNode[];
  edges: AppEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  validationErrors: ValidationError[];
  isSimulating: boolean;
  hasShortCircuit: boolean;
  activePreset: string;

  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
  addNode: (type: ComponentType, subType?: string, position?: { x: number; y: number }) => void;
  removeNode: (id: string) => void;
  updateNodeData: (id: string, partialData: Partial<AnyElectricalComponent>) => void;
  onNodesChange: (changes: unknown) => void;
  onEdgesChange: (changes: unknown) => void;
  connectNodes: (sourceId: string, targetId: string, sourceHandle: string, targetHandle: string) => void;
  removeEdge: (id: string) => void;
  updateEdgeData: (id: string, partialData: Partial<CableData>) => void;
  toggleNodeState: (id: string) => void;
  setNodePressed: (id: string, isPressed: boolean) => void;
  resetBreakers: () => void;
  testRcd: (id: string) => void;
  runSimulation: () => void;
  setSimulating: (active: boolean) => void;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedEdgeId: (id: string | null) => void;
  loadPreset: (presetKey: string) => void;
  clearCanvas: () => void;
}
