import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ShieldAlert, RotateCcw, ShieldCheck } from 'lucide-react';
import type { BreakerComponent } from '../../types/electrical';
import { useSchematicStore } from '../../store/schematicStore';

export const BreakerNode: React.FC<{ id: string; data: BreakerComponent; selected: boolean }> = ({
  id,
  data,
  selected,
}) => {
  const toggleNodeState = useSchematicStore((s) => s.toggleNodeState);

  const isOperative = data.isClosed && !data.isTripped;

  return (
    <div
      className={`relative min-w-[210px] rounded-xl bg-slate-900 border-2 shadow-xl transition-all duration-200 select-none ${
        data.isTripped
          ? 'border-rose-500 ring-2 ring-rose-500/40 animate-pulse'
          : selected
          ? 'border-blue-400 ring-2 ring-blue-400/30'
          : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 rounded-t-xl">
        <div className="flex items-center gap-2">
          {data.isTripped ? (
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          )}
          <span className="text-xs font-semibold text-slate-200">{data.name}</span>
        </div>

        <span className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 border border-slate-800">
          {data.curve}{data.ratedCurrent}A
        </span>
      </div>

      <div className="p-3 space-y-3">
        {data.isTripped ? (
          <div className="bg-rose-950/60 border border-rose-800/80 rounded-lg p-2 text-center space-y-1.5">
            <div className="text-[11px] font-bold text-rose-300">¡DISPARO MAGNETOTÉRMICO!</div>
            <div className="text-[10px] text-rose-200/80 leading-tight">
              {data.tripReason || 'Cortocircuito o sobrecarga detectada'}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeState(id);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-medium transition cursor-pointer shadow"
            >
              <RotateCcw className="w-3 h-3" />
              Rearmar Disyuntor
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400">Estado:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeState(id);
              }}
              className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                isOperative
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/50 shadow'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isOperative ? 'CERRADO (I)' : 'ABIERTO (O)'}
            </button>
          </div>
        )}

        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Intensidad actual:</span>
            <span className={`font-mono font-bold ${
              data.isTripped
                ? 'text-rose-400'
                : (data.measuredCurrentAmps || 0) > data.ratedCurrent * 0.8
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {data.measuredCurrentAmps ?? 0} A / {data.ratedCurrent} A
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                data.isTripped
                  ? 'bg-rose-500 w-full'
                  : (data.measuredCurrentAmps || 0) > data.ratedCurrent * 0.8
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: data.isTripped
                  ? '100%'
                  : `${Math.min(100, Math.round(((data.measuredCurrentAmps || 0) / data.ratedCurrent) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
          <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60 text-center">
            Poder de corte: {data.breakingCapacityKa} kA
          </div>
          <div className="bg-slate-950/40 p-1.5 rounded border border-slate-800/60 text-center">
            Norma: UNE-EN 60898
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/40 px-2 py-1.5 rounded">
            <Handle
              type="target"
              position={Position.Left}
              id="term-l-in"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
            />
            <span className="font-mono text-amber-400 pl-2">L Ent</span>
            <span className="font-mono text-amber-400 pr-2">L Sal</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-l-out"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-l-out"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-right-1.5 opacity-0"
            />
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/40 px-2 py-1.5 rounded">
            <Handle
              type="target"
              position={Position.Left}
              id="term-n-in"
              className="!w-3 !h-3 !bg-sky-500 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
            />
            <span className="font-mono text-sky-400 pl-2">N Ent</span>
            <span className="font-mono text-sky-400 pr-2">N Sal</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-n-out"
              className="!w-3 !h-3 !bg-sky-500 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-n-out"
              className="!w-3 !h-3 !bg-sky-500 !border-2 !border-slate-900 !-right-1.5 opacity-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
