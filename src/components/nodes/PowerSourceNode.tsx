import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Power } from 'lucide-react';
import type { PowerSourceComponent } from '../../types/electrical';
import { useSchematicStore } from '../../store/schematicStore';

export const PowerSourceNode: React.FC<{ id: string; data: PowerSourceComponent; selected: boolean }> = ({
  id,
  data,
  selected,
}) => {
  const toggleNodeState = useSchematicStore((s) => s.toggleNodeState);

  return (
    <div
      className={`relative min-w-[210px] rounded-xl bg-slate-900 border-2 shadow-xl transition-all duration-200 select-none ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/80 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${data.isPowered ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">{data.name}</div>
            <div className="text-[10px] font-mono text-slate-400">{data.voltage}V ~ {data.frequency}Hz AC</div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleNodeState(id);
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
            data.isPowered
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
          }`}
          title={data.isPowered ? 'Apagar fuente general' : 'Encender fuente general'}
        >
          <Power className="w-3 h-3" />
          {data.isPowered ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-400">Tensión Red:</span>
          <span className="font-mono font-medium text-emerald-400">{data.isPowered ? `${data.voltage} V` : '0 V'}</span>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">
            <span className="flex items-center gap-1.5 font-mono text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
              L (Fase 230V)
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-src-l"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-src-l"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-right-1.5 opacity-0"
            />
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">
            <span className="flex items-center gap-1.5 font-mono text-sky-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
              N (Neutro 0V)
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-src-n"
              className="!w-3 !h-3 !bg-sky-500 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-src-n"
              className="!w-3 !h-3 !bg-sky-500 !border-2 !border-slate-900 !-right-1.5 opacity-0"
            />
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-1.5 rounded border border-slate-800">
            <span className="flex items-center gap-1.5 font-mono text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-yellow-400 inline-block" />
              PE (Tierra)
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-src-pe"
              className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-src-pe"
              className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-900 !-right-1.5 opacity-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
