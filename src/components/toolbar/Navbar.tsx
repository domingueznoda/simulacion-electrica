import React, { useState } from 'react';
import {
  Zap,
  RotateCw,
  Trash2,
  HelpCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSchematicStore } from '../../store/schematicStore';
import { PRESET_CIRCUITS } from '../../engine/presets';
import { buzzerAudio } from '../../utils/buzzerAudio';
import { soundEffects } from '../../utils/soundEffects';

interface NavbarProps {
  onOpenHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenHelp }) => {
  const [isAudioMuted, setIsAudioMuted] = useState(() => soundEffects.getMuted());
  const clearCanvas = useSchematicStore((s) => s.clearCanvas);
  const loadPreset = useSchematicStore((s) => s.loadPreset);
  const activePreset = useSchematicStore((s) => s.activePreset);

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 select-none">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              ElectroSimulador
            </div>
            <div className="text-[10px] text-slate-400 font-mono hidden sm:block">Simulador Multifilar & REBT</div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-1 hidden md:block" />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden md:flex items-center gap-2">
          <label htmlFor="preset-select" className="text-xs text-slate-400 font-medium">Circuito:</label>
          <select
            id="preset-select"
            value={activePreset}
            onChange={(e) => loadPreset(e.target.value)}
            className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
          >
            {Object.values(PRESET_CIRCUITS).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => loadPreset(activePreset)}
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer active:scale-95"
          title="Restablecer circuito"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => {
            const nextMuted = soundEffects.toggleMute();
            if (buzzerAudio.getMuted() !== nextMuted) {
              buzzerAudio.toggleMute();
            }
            setIsAudioMuted(nextMuted);
          }}
          className={`p-1.5 sm:p-2 rounded-lg transition cursor-pointer active:scale-95 ${
            isAudioMuted
              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              : 'text-amber-400 hover:text-amber-300 hover:bg-slate-800'
          }`}
          title={isAudioMuted ? 'Activar efectos de sonido (clic de interruptores, disparos y timbre)' : 'Silenciar efectos de sonido'}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={clearCanvas}
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer active:scale-95"
          title="Limpiar lienzo"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenHelp}
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer active:scale-95"
          title="Ayuda y simbología"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
