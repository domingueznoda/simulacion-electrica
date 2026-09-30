import React, { useState } from 'react';
import {
  Zap,
  Play,
  RotateCcw,
  RotateCw,
  Trash2,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Volume2,
  VolumeX,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useSchematicStore } from '../../store/schematicStore';
import { PRESET_CIRCUITS } from '../../engine/presets';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { buzzerAudio } from '../../utils/buzzerAudio';

interface NavbarProps {
  onOpenHelp: () => void;
  onTogglePalette: () => void;
  isPaletteOpen: boolean;
  isDesktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenHelp,
  onTogglePalette,
  isDesktopCollapsed = false,
  onToggleDesktopCollapse,
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const isSimulating = useSchematicStore((s) => s.isSimulating);
  const setSimulating = useSchematicStore((s) => s.setSimulating);
  const resetBreakers = useSchematicStore((s) => s.resetBreakers);
  const clearCanvas = useSchematicStore((s) => s.clearCanvas);
  const loadPreset = useSchematicStore((s) => s.loadPreset);
  const activePreset = useSchematicStore((s) => s.activePreset);
  const hasShortCircuit = useSchematicStore((s) => s.hasShortCircuit);
  const validationErrors = useSchematicStore((s) => s.validationErrors);

  const criticalErrorsCount = validationErrors.filter(
    (e) => e.severity === 'critical' || e.severity === 'error'
  ).length;

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 select-none">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onTogglePalette}
          className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition cursor-pointer active:scale-95"
          title="Abrir paleta de elementos"
        >
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="text-xs">Elementos</span>
        </button>

        {isDesktopCollapsed && onToggleDesktopCollapse && (
          <button
            onClick={onToggleDesktopCollapse}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition cursor-pointer"
            title="Mostrar paleta de elementos"
          >
            <ChevronRight className="w-4 h-4 text-amber-400" />
            <span>Elementos</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Zap className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              ElectroSim <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">PWA</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono hidden sm:block">Simulador Multifilar & REBT</div>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-1 hidden md:block" />

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
          <button
            onClick={() => loadPreset(activePreset)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Restablecer circuito"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {hasShortCircuit ? (
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 fill-rose-500 text-slate-900 shrink-0" />
            <span className="hidden sm:inline">¡CORTOCIRCUITO!</span>
          </div>
        ) : criticalErrorsCount > 0 ? (
          <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{criticalErrorsCount} anomalías</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Circuito Seguro</span>
          </div>
        )}

        <button
          onClick={() => setSimulating(!isSimulating)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 ${
            isSimulating
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-950'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
          title={isSimulating ? 'Pausar evaluación' : 'Activar evaluación'}
        >
          <Play className={`w-3.5 h-3.5 ${isSimulating ? 'fill-white' : ''}`} />
          <span className="hidden md:inline">{isSimulating ? 'Simulando' : 'Pausado'}</span>
        </button>

        <button
          onClick={resetBreakers}
          className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer active:scale-95"
          title="Rearmar todas las protecciones"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Rearmar</span>
        </button>

        <button
          onClick={() => {
            const nextMuted = buzzerAudio.toggleMute();
            setIsAudioMuted(nextMuted);
          }}
          className={`p-1.5 sm:p-2 rounded-lg transition cursor-pointer active:scale-95 ${
            isAudioMuted
              ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              : 'text-rose-400 hover:text-rose-300 hover:bg-slate-800'
          }`}
          title={isAudioMuted ? 'Activar sonido del timbre' : 'Silenciar sonido del timbre'}
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

        <PWAInstallButton />
      </div>
    </header>
  );
};
