import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { Zap, X } from 'lucide-react';
import type { CableData } from '../../types/electrical';
import { useSchematicStore } from '../../store/schematicStore';

const WIRE_COLORS: Record<string, { stroke: string; glow: string }> = {
  phase: { stroke: '#d97706', glow: 'rgba(217, 119, 6, 0.4)' },
  neutral: { stroke: '#0284c7', glow: 'rgba(2, 132, 199, 0.4)' },
  ground: { stroke: '#16a34a', glow: 'rgba(22, 163, 74, 0.4)' },
  switched_phase: { stroke: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)' },
  traveler: { stroke: '#64748b', glow: 'rgba(100, 116, 139, 0.4)' },
};

export const ElectricalEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const removeEdge = useSchematicStore((s) => s.removeEdge);
  const cable = (data as CableData) || {
    wireType: 'phase',
    crossSectionMm2: 1.5,
    maxAllowedCurrentAmps: 16,
    hasCurrent: false,
    isEnergized: false,
    isShortCircuited: false,
  };

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const wireColorCfg = WIRE_COLORS[cable.wireType] || WIRE_COLORS.phase;
  const isShort = cable.isShortCircuited;
  const strokeColor = isShort ? '#ef4444' : wireColorCfg.stroke;
  const strokeWidth = cable.crossSectionMm2 >= 4 ? 4 : cable.crossSectionMm2 >= 2.5 ? 3 : 2.5;

  return (
    <>
      {cable.hasCurrent && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 5}
          className="blur-xs"
          style={{
            animation: 'electricalGlowAC 1.2s ease-in-out infinite',
          }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: cable.hasCurrent ? '8,5' : undefined,
          animation: cable.hasCurrent ? 'electricalFlowAC 1.2s ease-in-out infinite' : undefined,
          filter: selected ? 'drop-shadow(0 0 4px rgba(255,255,255,0.7))' : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="group flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs px-2 py-0.5 rounded-full border border-slate-700/80 text-[10px] text-slate-300 font-mono shadow-md transition hover:border-slate-500"
        >
          {isShort ? (
            <span className="flex items-center gap-0.5 text-rose-400 font-bold animate-bounce">
              <Zap className="w-3 h-3 fill-rose-500" />
              CORTO
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: strokeColor }}
              />
              <span>{cable.crossSectionMm2} mm²</span>
            </span>
          )}

          <button
            onClick={() => removeEdge(id)}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition cursor-pointer p-0.5"
            title="Eliminar conductor"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
