import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { Zap, X, AlertTriangle } from 'lucide-react';
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
  const selectedEdgeId = useSchematicStore((s) => s.selectedEdgeId);
  const setSelectedEdgeId = useSchematicStore((s) => s.setSelectedEdgeId);
  const validationErrors = useSchematicStore((s) => s.validationErrors);
  const isSelected = selected || selectedEdgeId === id;

  const cable = (data as CableData) || {
    wireType: 'phase',
    crossSectionMm2: 1.5,
    maxAllowedCurrentAmps: 16,
    hasCurrent: false,
    isEnergized: false,
    isShortCircuited: false,
  };

  const edgeError = validationErrors.find((err) => err.edgeIds.includes(id));
  const isUndersized = edgeError?.code === 'UNDERSIZED_CABLE';

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
  const strokeColor = isShort
    ? '#ef4444'
    : isUndersized
    ? '#f43f5e'
    : isSelected
    ? '#fbbf24'
    : wireColorCfg.stroke;
  const strokeWidth =
    (cable.crossSectionMm2 >= 4 ? 4 : cable.crossSectionMm2 >= 2.5 ? 3 : 2.5) +
    (isSelected || isUndersized ? 1.5 : 0);

  return (
    <>
      {(cable.hasCurrent || isUndersized) && (
        <path
          d={edgePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 5}
          className="blur-xs"
          style={{
            animation: isUndersized
              ? 'electricalGlowAC 0.8s ease-in-out infinite'
              : 'electricalGlowAC 1.2s ease-in-out infinite',
          }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isUndersized ? '6,4' : cable.hasCurrent ? '8,5' : undefined,
          animation: cable.hasCurrent ? 'electricalFlowAC 1.2s ease-in-out infinite' : undefined,
          filter: isSelected
            ? 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.9))'
            : isUndersized
            ? 'drop-shadow(0 0 6px rgba(244, 63, 94, 0.8))'
            : undefined,
        }}
      />

      <EdgeLabelRenderer>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEdgeId(id);
          }}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`group flex items-center gap-1 bg-slate-900/95 backdrop-blur-xs px-2.5 py-1 rounded-full border text-[10px] font-mono shadow-md transition cursor-pointer ${
            isUndersized
              ? 'border-rose-500 bg-rose-950/80 text-rose-300 ring-2 ring-rose-500/50 animate-pulse'
              : isSelected
              ? 'border-amber-400 ring-2 ring-amber-400/50 text-amber-200'
              : 'border-slate-700/80 hover:border-slate-500 text-slate-300'
          }`}
          title={
            edgeError
              ? `${edgeError.title}: ${edgeError.message}`
              : `Conductor ${cable.wireType} - ${cable.crossSectionMm2} mm²`
          }
        >
          {isShort ? (
            <span className="flex items-center gap-0.5 text-rose-400 font-bold animate-bounce">
              <Zap className="w-3 h-3 fill-rose-500" />
              CORTO
            </span>
          ) : isUndersized ? (
            <span className="flex items-center gap-1 font-bold text-rose-300">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                {cable.crossSectionMm2} mm² (¡Sección Insuficiente REBT!)
                {cable.measuredCurrentAmps && cable.measuredCurrentAmps > 0
                  ? ` [${cable.measuredCurrentAmps.toFixed(1)}A]`
                  : ''}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: strokeColor }}
              />
              <span>{cable.crossSectionMm2} mm²</span>
              {cable.hasCurrent && cable.measuredCurrentAmps && cable.measuredCurrentAmps > 0 ? (
                <span className="text-[9px] text-emerald-400 font-mono font-bold">
                  ({cable.measuredCurrentAmps.toFixed(1)}A)
                </span>
              ) : null}
            </span>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              removeEdge(id);
            }}
            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition cursor-pointer p-0.5 ml-0.5"
            title="Eliminar conductor"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
