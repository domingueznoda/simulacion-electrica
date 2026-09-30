import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type Node,
} from '@xyflow/react';
import { useSchematicStore } from '../../store/schematicStore';
import type { AppEdge, AppNode } from '../../types/electrical';
import { PowerSourceNode } from '../nodes/PowerSourceNode';
import { BreakerNode } from '../nodes/BreakerNode';
import { SwitchNode } from '../nodes/SwitchNode';
import { LoadNode } from '../nodes/LoadNode';
import { JunctionNode } from '../nodes/JunctionNode';
import { ElectricalEdge } from '../edges/ElectricalEdge';

export const SchematicCanvas: React.FC = () => {
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const onNodesChange = useSchematicStore((s) => s.onNodesChange);
  const onEdgesChange = useSchematicStore((s) => s.onEdgesChange);
  const connectNodes = useSchematicStore((s) => s.connectNodes);
  const setSelectedNodeId = useSchematicStore((s) => s.setSelectedNodeId);

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

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="flex-1 w-full h-full relative bg-slate-950">
      <ReactFlow<AppNode, AppEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2.0}
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
        <Controls className="!bg-slate-900 !border-slate-700 !text-slate-200 fill-slate-200 rounded-lg shadow-xl" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            if (node.type === 'sourceNode') return '#d97706';
            if (node.type === 'breakerNode') return '#0284c7';
            if (node.type === 'loadNode') return '#eab308';
            if (node.type === 'switchNode') return '#8b5cf6';
            return '#64748b';
          }}
          className="!bg-slate-900 !border-slate-800 rounded-xl overflow-hidden shadow-2xl hidden md:block"
        />
      </ReactFlow>
    </div>
  );
};
