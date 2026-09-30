import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers } from 'lucide-react';
import type { JunctionComponent } from '../../types/electrical';

export const JunctionNode: React.FC<{ id: string; data: JunctionComponent; selected: boolean }> = ({
  data,
  selected,
}) => {
  return (
    <div
      className={`relative min-w-[170px] rounded-xl bg-slate-900 border-2 shadow-xl transition-all duration-200 select-none ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 rounded-t-xl">
        <Layers className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-semibold text-slate-200">{data.name}</span>
      </div>

      <div className="p-3 space-y-2">
        <div className="text-[10px] text-slate-400 text-center">
          Conexión equipotencial 3 bornas
        </div>

        <div className="space-y-1.5">
          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
            <Handle
              type="target"
              position={Position.Left}
              id="term-j-1"
              className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-left-1.5"
            />
            <span className="font-mono text-slate-300 text-xs pl-2">Borna 1</span>
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
            <span className="font-mono text-slate-300 text-xs pr-2 ml-auto">Borna 2</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-j-2"
              className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-right-1.5"
            />
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
            <span className="font-mono text-slate-300 text-xs pr-2 ml-auto">Borna 3</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-j-3"
              className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-right-1.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
