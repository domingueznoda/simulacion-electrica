import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import { Plus } from 'lucide-react';
import { useSchematicStore } from '../../store/schematicStore';
import type { AppEdge, AppNode } from '../../types/electrical';
import { PowerSourceNode } from '../nodes/PowerSourceNode';
import { BreakerNode } from '../nodes/BreakerNode';
import { SwitchNode } from '../nodes/SwitchNode';
import { LoadNode } from '../nodes/LoadNode';
import { JunctionNode } from '../nodes/JunctionNode';
import { ElectricalEdge } from '../edges/ElectricalEdge';

interface SchematicCanvasProps {
  isPaletteOpen: boolean;
  onOpenPalette: () => void;
}

const SchematicCanvasInner: React.FC<SchematicCanvasProps> = ({
  isPaletteOpen,
  onOpenPalette,
}) => {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const activePreset = useSchematicStore((s) => s.activePreset);
  const onNodesChange = useSchematicStore((s) => s.onNodesChange);
  const onEdgesChange = useSchematicStore((s) => s.onEdgesChange);
  const connectNodes = useSchematicStore((s) => s.connectNodes);
  const setSelectedNodeId = useSchematicStore((s) => s.setSelectedNodeId);
  const setSelectedEdgeId = useSchematicStore((s) => s.setSelectedEdgeId);

  const { fitView } = useReactFlow();

  // Ajuste automático suave de la cámara a vista de pájaro cuando se abre o cambia la plantilla
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      fitView({ padding: 0.12, duration: 450 });
    }, 60);
    return () => clearTimeout(timer);
  }, [activePreset, fitView]);

  const nodeTypes = useMemo(
    () => ({
      sourceNode: PowerSourceNode,
      breakerNode: BreakerNode,
      switchNode: SwitchNode,
      loadNode: LoadNode,
      junctionNode: JunctionNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      electricalEdge: ElectricalEdge,
    }),
    []
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        connectNodes(params.source, params.target, params.sourceHandle, params.targetHandle);
      }
    },
    [connectNodes]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdgeId(edge.id);
    },
    [setSelectedEdgeId]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [setSelectedNodeId, setSelectedEdgeId]);

  return (
    <div className="flex-1 w-full h-full relative bg-slate-950">
      {!isPaletteOpen && (
        <button
          onClick={onOpenPalette}
          className="absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-500 active:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/60 backdrop-blur-xs transition cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Añadir Elemento</span>
        </button>
      )}

      <ReactFlow<AppNode, AppEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, minZoom: 0.05, maxZoom: 1.0 }}
        minZoom={0.05}
        maxZoom={2.5}
        defaultEdgeOptions={{
          type: 'electricalEdge',
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#334155"
        />
        <Controls className="!bg-slate-900 !border-slate-700 rounded-xl shadow-2xl overflow-hidden" />
      </ReactFlow>
    </div>
  );
};

export const SchematicCanvas: React.FC<SchematicCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SchematicCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
