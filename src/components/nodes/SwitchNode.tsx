import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Lock, Unlock, MousePointerClick } from 'lucide-react';
import type { SwitchComponent } from '../../types/electrical';
import { useSchematicStore } from '../../store/schematicStore';

export const SwitchNode: React.FC<{ id: string; data: SwitchComponent; selected: boolean }> = ({
  id,
  data,
  selected,
}) => {
  const toggleNodeState = useSchematicStore((s) => s.toggleNodeState);
  const setNodePressed = useSchematicStore((s) => s.setNodePressed);
  const [isLocked, setIsLocked] = useState(false);

  const renderSinglePoleSwitch = () => {
    const isClosed = data.position === 'closed';

    return (
      <div className="space-y-3">
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleNodeState(id);
          }}
          className={`group relative p-2.5 rounded-xl border-2 transition-all cursor-pointer select-none active:scale-[0.98] ${
            isClosed
              ? 'bg-amber-950/40 border-amber-500/80 shadow-lg shadow-amber-950/50'
              : 'bg-slate-950/60 border-slate-700/80 hover:border-slate-500 shadow-md'
          }`}
          title="Haz clic para bascular el interruptor"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition" />
              Tecla Basculante
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold transition ${
                isClosed
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isClosed ? 'I (CERRADO)' : 'O (ABIERTO)'}
            </span>
          </div>

          <div className="relative h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
            <div
              className={`absolute inset-1 rounded-md transition-all duration-200 border flex items-center justify-between px-3 ${
                isClosed
                  ? 'bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-amber-900/40 border-amber-500/50 shadow-inner'
                  : 'bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-slate-700 shadow-md'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    isClosed
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                      : 'bg-slate-700'
                  }`}
                />
                <span className="text-[11px] font-mono font-bold text-slate-300">
                  {isClosed ? 'CONDUCE' : 'CORTADO'}
                </span>
              </div>

              <svg width="60" height="28" viewBox="0 0 60 28" className="overflow-visible">
                <line x1="4" y1="14" x2="16" y2="14" stroke="#d97706" strokeWidth="2.5" />
                <circle cx="16" cy="14" r="2.5" fill="#d97706" />
                <circle cx="44" cy="14" r="2.5" fill="#d97706" />
                <line x1="44" y1="14" x2="56" y2="14" stroke="#d97706" strokeWidth="2.5" />
                {isClosed ? (
                  <line
                    x1="16"
                    y1="14"
                    x2="44"
                    y2="14"
                    stroke="#fbbf24"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                  />
                ) : (
                  <line
                    x1="16"
                    y1="14"
                    x2="38"
                    y2="4"
                    stroke="#94a3b8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[11px] bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <Handle
            type="target"
            position={Position.Left}
            id="term-sw-in"
            className="!w-3.5 !h-3.5 !bg-amber-600 !border-2 !border-slate-900 !-left-2 hover:!scale-125 transition"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="term-sw-in"
            className="!w-3.5 !h-3.5 !bg-amber-600 !border-2 !border-slate-900 !-left-2 opacity-0"
          />
          <span className="font-mono text-amber-400 pl-2">L (Entrada)</span>
          <span className="font-mono text-amber-300 pr-2">Vuelta Lámpara</span>
          <Handle
            type="source"
            position={Position.Right}
            id="term-sw-out"
            className="!w-3.5 !h-3.5 !bg-amber-500 !border-2 !border-slate-900 !-right-2 hover:!scale-125 transition"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="term-sw-out"
            className="!w-3.5 !h-3.5 !bg-amber-500 !border-2 !border-slate-900 !-right-2 opacity-0"
          />
        </div>
      </div>
    );
  };

  const renderTwoWaySwitch = () => {
    const isPos1 = data.position === 'pos_1';

    return (
      <div className="space-y-3">
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleNodeState(id);
          }}
          className="group relative p-2.5 rounded-xl border-2 border-indigo-500/50 bg-slate-950/70 hover:border-indigo-400 shadow-lg transition-all cursor-pointer select-none active:scale-[0.98]"
          title="Haz clic para alternar entre Vía 1 y Vía 2"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition" />
              Conmutador 2 Vías
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-indigo-600 text-white shadow-xs">
              {isPos1 ? 'VÍA 1 (L1)' : 'VÍA 2 (L2)'}
            </span>
          </div>

          <div className="relative h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
            <svg width="140" height="42" viewBox="0 0 140 42" className="overflow-visible">
              <line x1="8" y1="21" x2="30" y2="21" stroke="#d97706" strokeWidth="2.5" />
              <circle cx="30" cy="21" r="3" fill="#d97706" />

              <circle cx="110" cy="10" r="3" fill={isPos1 ? '#818cf8' : '#475569'} />
              <line x1="110" y1="10" x2="132" y2="10" stroke={isPos1 ? '#818cf8' : '#475569'} strokeWidth="2.5" />
              <text x="96" y="13" fontSize="8" fill={isPos1 ? '#818cf8' : '#64748b'} fontFamily="monospace" fontWeight="bold">L1</text>

              <circle cx="110" cy="32" r="3" fill={!isPos1 ? '#818cf8' : '#475569'} />
              <line x1="110" y1="32" x2="132" y2="32" stroke={!isPos1 ? '#818cf8' : '#475569'} strokeWidth="2.5" />
              <text x="96" y="35" fontSize="8" fill={!isPos1 ? '#818cf8' : '#64748b'} fontFamily="monospace" fontWeight="bold">L2</text>

              {isPos1 ? (
                <line
                  x1="30"
                  y1="21"
                  x2="110"
                  y2="10"
                  stroke="#818cf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_6px_rgba(129,140,248,0.9)] transition-all duration-200"
                />
              ) : (
                <line
                  x1="30"
                  y1="21"
                  x2="110"
                  y2="32"
                  stroke="#818cf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_6px_rgba(129,140,248,0.9)] transition-all duration-200"
                />
              )}
            </svg>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/70 px-2.5 py-2 rounded-lg border border-slate-800">
            <Handle
              type="target"
              position={Position.Left}
              id="term-sw-l1"
              className={`!w-4 !h-4 !border-2 !border-slate-900 !-left-2 hover:!scale-125 transition shadow-md ${
                isPos1 ? '!bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]' : '!bg-slate-600'
              }`}
            />
            <Handle
              type="source"
              position={Position.Left}
              id="term-sw-l1"
              className="!w-4 !h-4 !-left-2 opacity-0"
            />

            <span className={`font-mono text-xs pl-2 font-bold flex items-center gap-1.5 ${
              isPos1 ? 'text-indigo-300' : 'text-slate-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isPos1 ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]' : 'bg-slate-600'}`} />
              Borne L1 (Izq)
            </span>

            <span className={`font-mono text-xs pr-2 font-bold flex items-center gap-1.5 ${
              !isPos1 ? 'text-indigo-300' : 'text-slate-400'
            }`}>
              Borne L2 (Der)
              <span className={`w-2 h-2 rounded-full ${!isPos1 ? 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]' : 'bg-slate-600'}`} />
            </span>

            <Handle
              type="source"
              position={Position.Right}
              id="term-sw-l2"
              className={`!w-4 !h-4 !border-2 !border-slate-900 !-right-2 hover:!scale-125 transition shadow-md ${
                !isPos1 ? '!bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]' : '!bg-slate-600'
              }`}
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-sw-l2"
              className="!w-4 !h-4 !-right-2 opacity-0"
            />
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-amber-950/20 px-2.5 py-1.5 rounded-lg border border-amber-800/50 mt-1">
            <span className="font-mono text-amber-400 pl-1 flex items-center gap-1.5 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
              Borne Común (COM)
            </span>
            <span className="text-[10px] text-amber-300/80 font-mono pr-1">Fase / Vuelta (Inferior)</span>

            {/* Exactamente UN solo borne físico de Común por debajo */}
            <Handle
              type="target"
              position={Position.Bottom}
              id="term-sw-com"
              style={{ left: '50%' }}
              className="!w-4 !h-4 !bg-amber-500 !border-2 !border-slate-900 !-bottom-2 hover:!scale-125 transition shadow-md"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="term-sw-com"
              style={{ left: '50%' }}
              className="!w-4 !h-4 !bg-amber-500 !border-2 !border-slate-900 !-bottom-2 opacity-0"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderIntermediateSwitch = () => {
    const isStraight = data.position === 'straight';

    return (
      <div className="space-y-3">
        <div
          onClick={(e) => {
            e.stopPropagation();
            toggleNodeState(id);
          }}
          className="group relative p-2.5 rounded-xl border-2 border-violet-500/50 bg-slate-950/70 hover:border-violet-400 shadow-lg transition-all cursor-pointer select-none active:scale-[0.98]"
          title="Haz clic para conmutar el cruce de vías"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <MousePointerClick className="w-3.5 h-3.5 text-violet-400 group-hover:scale-110 transition" />
              Mecanismo Cruzamiento
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-violet-600 text-white shadow-xs">
              {isStraight ? 'PARALELO (=)' : 'CRUZADO (X)'}
            </span>
          </div>

          <div className="relative h-14 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
            <svg width="140" height="42" viewBox="0 0 140 42" className="overflow-visible">
              <circle cx="20" cy="11" r="3" fill="#a78bfa" />
              <circle cx="20" cy="31" r="3" fill="#a78bfa" />
              <circle cx="120" cy="11" r="3" fill="#a78bfa" />
              <circle cx="120" cy="31" r="3" fill="#a78bfa" />

              {isStraight ? (
                <>
                  <line
                    x1="20"
                    y1="11"
                    x2="120"
                    y2="11"
                    stroke="#a78bfa"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_rgba(167,139,250,0.9)]"
                  />
                  <line
                    x1="20"
                    y1="31"
                    x2="120"
                    y2="31"
                    stroke="#a78bfa"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_rgba(167,139,250,0.9)]"
                  />
                </>
              ) : (
                <>
                  <line
                    x1="20"
                    y1="11"
                    x2="120"
                    y2="31"
                    stroke="#c084fc"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_rgba(192,132,252,0.9)]"
                  />
                  <line
                    x1="20"
                    y1="31"
                    x2="120"
                    y2="11"
                    stroke="#c084fc"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_0_6px_rgba(192,132,252,0.9)]"
                  />
                </>
              )}
            </svg>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800">
            <Handle
              type="target"
              position={Position.Left}
              id="term-cr-in1"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-left-2 hover:!scale-125 transition"
            />
            <Handle
              type="source"
              position={Position.Left}
              id="term-cr-in1"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-left-2 opacity-0"
            />
            <span className="font-mono text-slate-300 pl-2">Entrada 1</span>
            <span className="font-mono text-slate-300 pr-2">Salida 1</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-cr-out1"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-right-2 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-cr-out1"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-right-2 opacity-0"
            />
          </div>

          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/70 px-2 py-1 rounded-lg border border-slate-800">
            <Handle
              type="target"
              position={Position.Left}
              id="term-cr-in2"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-left-2 hover:!scale-125 transition"
            />
            <Handle
              type="source"
              position={Position.Left}
              id="term-cr-in2"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-left-2 opacity-0"
            />
            <span className="font-mono text-slate-300 pl-2">Entrada 2</span>
            <span className="font-mono text-slate-300 pr-2">Salida 2</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-cr-out2"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-right-2 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-cr-out2"
              className="!w-3.5 !h-3.5 !bg-slate-400 !border-2 !border-slate-900 !-right-2 opacity-0"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderPushbutton = () => {
    const isPressed = data.isPressed;

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      setNodePressed(id, true);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!isLocked) {
        setNodePressed(id, false);
      }
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!isLocked) {
        setNodePressed(id, false);
      }
    };

    return (
      <div className="space-y-3">
        <div className="p-2.5 rounded-xl border-2 border-yellow-500/40 bg-slate-950/70 select-none">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-300">
              Pulsador Momentáneo (NO)
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextLocked = !isLocked;
                setIsLocked(nextLocked);
                setNodePressed(id, nextLocked);
              }}
              className={`p-1 rounded-md text-[10px] font-mono flex items-center gap-1 border transition cursor-pointer ${
                isLocked
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={isLocked ? 'Desbloquear pulsador' : 'Fijar pulsado para pruebas'}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {isLocked ? 'Fijado' : 'Fijar'}
            </button>
          </div>

          <div className="flex flex-col items-center justify-center py-2">
            <button
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              className={`w-28 h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-75 cursor-pointer touch-none select-none border-2 ${
                isPressed
                  ? 'bg-amber-500 border-amber-300 text-slate-950 scale-95 translate-y-1 shadow-inner ring-4 ring-amber-400/40'
                  : 'bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 border-slate-600 text-slate-200 shadow-xl hover:border-slate-500 hover:brightness-110'
              }`}
            >
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-1 transition ${
                isPressed ? 'border-slate-950 bg-amber-400' : 'border-slate-400 bg-slate-950/40'
              }`}>
                <div className={`w-3.5 h-3.5 rounded-full transition ${isPressed ? 'bg-slate-950' : 'bg-amber-400'}`} />
              </div>
              <span className="text-[11px] font-bold tracking-tight font-mono">
                {isPressed ? '¡PULSADO!' : 'MANTÉN PULSADO'}
              </span>
              <span className="text-[9px] opacity-75 font-mono">
                {isPressed ? 'Circuito Cerrado' : 'Al soltar se abre'}
              </span>
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-[11px] bg-slate-950/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
          <Handle
            type="target"
            position={Position.Left}
            id="term-pb-in"
            className="!w-3.5 !h-3.5 !bg-amber-600 !border-2 !border-slate-900 !-left-2 hover:!scale-125 transition"
          />
          <Handle
            type="source"
            position={Position.Left}
            id="term-pb-in"
            className="!w-3.5 !h-3.5 !bg-amber-600 !border-2 !border-slate-900 !-left-2 opacity-0"
          />
          <span className="font-mono text-amber-400 pl-2">Entrada</span>
          <span className="font-mono text-amber-300 pr-2">Salida</span>
          <Handle
            type="source"
            position={Position.Right}
            id="term-pb-out"
            className="!w-3.5 !h-3.5 !bg-amber-500 !border-2 !border-slate-900 !-right-2 hover:!scale-125 transition"
          />
          <Handle
            type="target"
            position={Position.Right}
            id="term-pb-out"
            className="!w-3.5 !h-3.5 !bg-amber-500 !border-2 !border-slate-900 !-right-2 opacity-0"
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative min-w-[240px] rounded-2xl bg-slate-900/95 border-2 shadow-2xl transition-all duration-200 select-none ${
        selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-slate-700/80 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          <span className="text-xs font-bold text-slate-100">{data.name}</span>
        </div>
        <span className="text-[10px] text-amber-400/90 uppercase font-mono tracking-wider font-semibold">
          {data.switchType.replace('_', ' ')}
        </span>
      </div>

      <div className="p-3">
        {data.switchType === 'single_pole' && renderSinglePoleSwitch()}
        {data.switchType === 'two_way' && renderTwoWaySwitch()}
        {data.switchType === 'intermediate' && renderIntermediateSwitch()}
        {data.switchType === 'pushbutton' && renderPushbutton()}
      </div>
    </div>
  );
};
