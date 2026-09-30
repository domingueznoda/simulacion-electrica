import React, { useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Lightbulb, Plug, Bell, Fan, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import type { LoadComponent } from '../../types/electrical';
import { buzzerAudio } from '../../utils/buzzerAudio';

export const LoadNode: React.FC<{ id: string; data: LoadComponent; selected: boolean }> = ({
  data,
  selected,
}) => {
  useEffect(() => {
    if (data.loadType === 'buzzer') {
      if (data.isOn) {
        buzzerAudio.start();
      } else {
        buzzerAudio.stop();
      }
    }
    return () => {
      if (data.loadType === 'buzzer') {
        buzzerAudio.stop();
      }
    };
  }, [data.loadType, data.isOn]);

  const renderVisualIcon = () => {
    if (data.loadType === 'lamp') {
      return (
        <div className="relative flex items-center justify-center p-3">
          {data.isOn && (
            <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl animate-pulse" />
          )}
          <div
            className={`relative p-3 rounded-full transition-all duration-300 ${
              data.isOn
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_30px_rgba(251,191,36,0.8)] scale-110'
                : data.isEnergized
                ? 'bg-slate-800 text-amber-500/80 border border-amber-500/40'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            <Lightbulb className={`w-8 h-8 ${data.isOn ? 'fill-amber-300' : ''}`} />
          </div>
        </div>
      );
    }

    if (data.loadType === 'socket') {
      return (
        <div className="relative flex items-center justify-center p-3">
          <div
            className={`p-3 rounded-xl border transition-all duration-300 ${
              data.isOn
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}
          >
            <Plug className="w-8 h-8" />
          </div>
        </div>
      );
    }

    if (data.loadType === 'buzzer') {
      return (
        <div className="relative flex items-center justify-center p-3">
          {data.isOn && (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping opacity-75" />
              <div className="absolute -inset-2 rounded-full bg-rose-500/25 blur-md animate-pulse" />
            </>
          )}
          <div
            className={`relative p-3 rounded-full border transition-all duration-300 ${
              data.isOn
                ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.8)] scale-110'
                : data.isEnergized
                ? 'bg-slate-800 text-rose-400/80 border border-rose-500/40'
                : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}
          >
            <Bell className={`w-8 h-8 ${data.isOn ? 'animate-bounce' : ''}`} />
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex items-center justify-center p-3">
        <div
          className={`p-3 rounded-full border transition-all duration-300 ${
            data.isOn
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
              : 'bg-slate-800 text-slate-500 border-slate-700'
          }`}
        >
          <Fan className={`w-8 h-8 ${data.isOn ? 'animate-spin' : ''}`} />
        </div>
      </div>
    );
  };

  const getStatusText = () => {
    if (data.isOn) {
      return data.loadType === 'buzzer' ? '¡SONANDO (PIII)!' : 'ENCENDIDA';
    }
    if (data.isEnergized) {
      return 'FASE ACTIVA (FALTA NEUTRO)';
    }
    return 'APAGADA';
  };

  return (
    <div
      className={`relative min-w-[210px] rounded-xl bg-slate-900 border-2 shadow-xl transition-all duration-200 select-none ${
        data.isOn
          ? 'border-amber-400/90 ring-2 ring-amber-400/30'
          : selected
          ? 'border-blue-400 ring-2 ring-blue-400/30'
          : 'border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/90 border-b border-slate-700/80 rounded-t-xl">
        <span className="text-xs font-semibold text-slate-200">{data.name}</span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            data.isOn
              ? data.loadType === 'buzzer'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                : 'bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse'
              : data.isEnergized
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {getStatusText()}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {renderVisualIcon()}

        {data.isEnergized && !data.isOn && (
          <div className="flex items-center gap-1.5 p-1.5 bg-amber-950/40 border border-amber-800/60 rounded text-[10px] text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Circuito incompleto: conecte el retorno de Neutro</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/60 p-2 rounded-lg border border-slate-800">
          <div>
            <div className="text-slate-400">Potencia:</div>
            <div className="font-mono font-semibold text-slate-200">{data.ratedPowerWatts} W</div>
          </div>
          <div>
            <div className="text-slate-400">Consumo:</div>
            <div className="font-mono font-semibold text-emerald-400">{data.currentDrawAmps} A</div>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="relative flex items-center justify-between text-[11px] bg-slate-950/50 px-2 py-1.5 rounded border border-slate-800">
            <Handle
              type="target"
              position={Position.Left}
              id="term-load-l"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="source"
              position={Position.Left}
              id="term-load-l"
              className="!w-3 !h-3 !bg-amber-600 !border-2 !border-slate-900 !-left-1.5 opacity-0"
            />
            <span className="font-mono text-amber-400 pl-2">Borne Fase (L)</span>
            <span className="font-mono text-sky-400 pr-2">Borne Neutro (N)</span>
            <Handle
              type="source"
              position={Position.Right}
              id="term-load-n"
              className="!w-3 !h-3 !bg-sky-500 !border-2 !border-slate-900 !-right-1.5 hover:!scale-125 transition"
            />
            <Handle
              type="target"
              position={Position.Right}
              id="term-load-n"
              className="!w-3 !h-3 !bg-sky-500 !border-2 !border-slate-900 !-right-1.5 opacity-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
