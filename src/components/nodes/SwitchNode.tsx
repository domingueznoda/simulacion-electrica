import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ToggleLeft, ToggleRight, GitCommit, Split } from 'lucide-react';
import type { SwitchComponent } from '../../types/electrical';
import { useSchematicStore } from '../../store/schematicStore';

export const SwitchNode: React.FC<{ id: string; data: SwitchComponent; selected: boolean }> = ({
  id,
  data,
  selected,
}) => {
  const toggleNodeState = useSchematicStore((s) => s.toggleNodeState);

  const renderSwitchSpecifics = () => {
    if (data.switchType === 'single_pole') {
      const isClosed = data.position === 'closed';
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Contacto:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeState(id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow ${
                isClosed
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-400/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {isClosed ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              {isClosed ? 'CERRADO (Conduce)' : 'ABIERTO (Corta)'}
            </button>
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
            <Handle
              type="target"
              position={Position.Left}
              id="term-sw-in"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="source"
              position={Position.Left}
              id="term-sw-in"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 opacity-0"
            />
            <span className="font-mono text-amber-400 pl-2">L Entrada</span>
            <span className="font-mono text-amber-300 pr-2">Vuelta Lámpara</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-sw-out"
              className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-sw-out"
              className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900 !-right-1.5 opacity-0"
            />
          </div>
        </div>
      );
    }

    if (data.switchType === 'two_way') {
      const isPos1 = data.position === 'pos_1';
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Conexión:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeState(id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition cursor-pointer shadow"
            >
              <Split className="w-3.5 h-3.5" />
              {isPos1 ? 'Vía 1 (COM -> L1)' : 'Vía 2 (COM -> L2)'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
              <Handle
                type="target"
                position={Position.Left}
                id="term-sw-com"
                className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
              />
              <span className="font-mono text-amber-400 pl-2">COM (Común)</span>
              <Handle
                type="source"
                position={Position.Right}
                id="term-sw-com"
                className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
              />
            </div>

            <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
              <Handle
                type="target"
                position={Position.Left}
                id="term-sw-l1"
                className={`!w-3 !h-3 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition ${isPos1 ? '!bg-indigo-400' : '!bg-slate-600'}`}
              />
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isPos1 ? 'bg-indigo-500/30 text-indigo-300 font-bold' : 'text-slate-400'}`}>
                L1 (Viajero 1)
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="term-sw-l1"
                className={`!w-3 !h-3 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition ${isPos1 ? '!bg-indigo-400' : '!bg-slate-600'}`}
              />
            </div>

            <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
              <Handle
                type="target"
                position={Position.Left}
                id="term-sw-l2"
                className={`!w-3 !h-3 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition ${!isPos1 ? '!bg-indigo-400' : '!bg-slate-600'}`}
              />
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${!isPos1 ? 'bg-indigo-500/30 text-indigo-300 font-bold' : 'text-slate-400'}`}>
                L2 (Viajero 2)
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id="term-sw-l2"
                className={`!w-3 !h-3 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition ${!isPos1 ? '!bg-indigo-400' : '!bg-slate-600'}`}
              />
            </div>
          </div>
        </div>
      );
    }

    if (data.switchType === 'intermediate') {
      const isStraight = data.position === 'straight';
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Modo Cruce:</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeState(id);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 transition cursor-pointer shadow"
            >
              <GitCommit className="w-3.5 h-3.5" />
              {isStraight ? 'Paralelo (=)' : 'Cruzado (X)'}
            </button>
          </div>

          <div className="space-y-2">
            <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
              <Handle
                type="target"
                position={Position.Left}
                id="term-cr-in1"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
              />
              <Handle
                type="source"
                position={Position.Left}
                id="term-cr-in1"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-left-1.5 opacity-0"
              />
              <span className="font-mono text-slate-300 pl-2">Ent 1</span>
              <span className="font-mono text-slate-300 pr-2">Sal 1</span>
              <Handle
                type="source"
                position={Position.Right}
                id="term-cr-out1"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
              />
              <Handle
                type="target"
                position={Position.Right}
                id="term-cr-out1"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-right-1.5 opacity-0"
              />
            </div>

            <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
              <Handle
                type="target"
                position={Position.Left}
                id="term-cr-in2"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
              />
              <Handle
                type="source"
                position={Position.Left}
                id="term-cr-in2"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-left-1.5 opacity-0"
              />
              <span className="font-mono text-slate-300 pl-2">Ent 2</span>
              <span className="font-mono text-slate-300 pr-2">Sal 2</span>
              <Handle
                type="source"
                position={Position.Right}
                id="term-cr-out2"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
              />
              <Handle
                type="target"
                position={Position.Right}
                id="term-cr-out2"
                className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 !-right-1.5 opacity-0"
              />
            </div>
          </div>
        </div>
      );
    }

    const isPressed = data.isPressed;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Pulsador:</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNodeState(id);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow ${
              isPressed
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 ring-2 ring-amber-400/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isPressed ? 'PULSADO (Activo)' : 'EN REPOSO (Abierto)'}
          </button>
        </div>

        <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
          <Handle
            type="target"
            position={Position.Left}
            id="term-pb-in"
            className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="term-pb-in"
            className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 opacity-0"
          />
          <span className="font-mono text-amber-400 pl-2">Entrada</span>
          <span className="font-mono text-amber-300 pr-2">Salida</span>
          <Handle
            type="source"
            position={Position.Right}
            id="term-pb-out"
            className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="term-pb-out"
            className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900 !-right-1.5 opacity-0"
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative min-w-[210px] rounded-xl bg-slate-900 border-2 shadow-xl transition-all duration-200 select-none ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-xs font-semibold text-slate-200">{data.name}</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
          {data.switchType.replace('_', ' ')}
        </span>
      </div>

      <div className="p-3">{renderSwitchSpecifics()}</div>
    </div>
  );
};
