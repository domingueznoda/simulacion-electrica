import React from 'react';
import {
  Zap,
  Shield,
  ToggleRight,
  Split,
  GitCommit,
  Lightbulb,
  Plug,
  Bell,
  Fan,
  Layers,
  CircleDot,
  Plus,
} from 'lucide-react';
import { useSchematicStore } from '../../store/schematicStore';
import type { ComponentType } from '../../types/electrical';

interface PaletteItem {
  name: string;
  type: ComponentType;
  subType?: string;
  description: string;
  icon: React.ReactNode;
  category: 'source' | 'protection' | 'switch' | 'load' | 'junction';
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    name: 'Red 230V AC',
    type: 'source',
    description: 'Fase, Neutro y Tierra',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    category: 'source',
  },
  {
    name: 'PIA 10A',
    type: 'breaker',
    subType: '10A',
    description: 'Protección Alumbrado',
    icon: <Shield className="w-4 h-4 text-sky-400" />,
    category: 'protection',
  },
  {
    name: 'PIA 16A',
    type: 'breaker',
    subType: '16A',
    description: 'Protección Tomas de Corriente',
    icon: <Shield className="w-4 h-4 text-blue-400" />,
    category: 'protection',
  },
  {
    name: 'PIA 25A',
    type: 'breaker',
    subType: '25A',
    description: 'Línea de Potencia / Cocina',
    icon: <Shield className="w-4 h-4 text-indigo-400" />,
    category: 'protection',
  },
  {
    name: 'Interruptor Simple',
    type: 'switch',
    subType: 'single_pole',
    description: 'Corte unipolar Fase',
    icon: <ToggleRight className="w-4 h-4 text-amber-300" />,
    category: 'switch',
  },
  {
    name: 'Conmutador',
    type: 'switch',
    subType: 'two_way',
    description: 'Control desde 2 puntos',
    icon: <Split className="w-4 h-4 text-indigo-300" />,
    category: 'switch',
  },
  {
    name: 'Cruzamiento',
    type: 'switch',
    subType: 'intermediate',
    description: 'Control intermedio 3+ puntos',
    icon: <GitCommit className="w-4 h-4 text-violet-300" />,
    category: 'switch',
  },
  {
    name: 'Pulsador',
    type: 'switch',
    subType: 'pushbutton',
    description: 'Contacto momentáneo timbre',
    icon: <CircleDot className="w-4 h-4 text-yellow-300" />,
    category: 'switch',
  },
  {
    name: 'Lámpara LED',
    type: 'load',
    subType: 'lamp',
    description: '15W 230V Alumbrado',
    icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
    category: 'load',
  },
  {
    name: 'Toma Schuko 16A',
    type: 'load',
    subType: 'socket',
    description: 'Base de enchufe con tierra',
    icon: <Plug className="w-4 h-4 text-emerald-400" />,
    category: 'load',
  },
  {
    name: 'Timbre Avisador',
    type: 'load',
    subType: 'buzzer',
    description: '10W Campana acústica',
    icon: <Bell className="w-4 h-4 text-rose-400" />,
    category: 'load',
  },
  {
    name: 'Extractor / Motor',
    type: 'load',
    subType: 'motor',
    description: '80W Ventilación forzada',
    icon: <Fan className="w-4 h-4 text-cyan-400" />,
    category: 'load',
  },
  {
    name: 'Borna WAGO 3P',
    type: 'junction',
    description: 'Caja derivación equipotencial',
    icon: <Layers className="w-4 h-4 text-orange-400" />,
    category: 'junction',
  },
];

export const ComponentPalette: React.FC = () => {
  const addNode = useSchematicStore((s) => s.addNode);

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-full overflow-hidden select-none z-20">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Paleta de Elementos
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Haz clic para añadir</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            Alimentación & Distribución
          </div>
          <div className="space-y-1">
            {PALETTE_ITEMS.filter((i) => i.category === 'source' || i.category === 'junction').map((item) => (
              <button
                key={item.name}
                onClick={() => addNode(item.type, item.subType)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-slate-900 group-hover:scale-105 transition">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            Protecciones (Magnetotérmicos)
          </div>
          <div className="space-y-1">
            {PALETTE_ITEMS.filter((i) => i.category === 'protection').map((item) => (
              <button
                key={item.name}
                onClick={() => addNode(item.type, item.subType)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-slate-900 group-hover:scale-105 transition">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            Mecanismos de Control
          </div>
          <div className="space-y-1">
            {PALETTE_ITEMS.filter((i) => i.category === 'switch').map((item) => (
              <button
                key={item.name}
                onClick={() => addNode(item.type, item.subType)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-slate-900 group-hover:scale-105 transition">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
            Receptores & Cargas
          </div>
          <div className="space-y-1">
            {PALETTE_ITEMS.filter((i) => i.category === 'load').map((item) => (
              <button
                key={item.name}
                onClick={() => addNode(item.type, item.subType)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition cursor-pointer group"
              >
                <div className="p-1.5 rounded-md bg-slate-900 group-hover:scale-105 transition">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
