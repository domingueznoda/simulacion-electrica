import React, { useState } from 'react';
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
  ChevronLeft,
  RotateCw,
  Search,
} from 'lucide-react';
import { useSchematicStore } from '../../store/schematicStore';
import { PRESET_CIRCUITS } from '../../engine/presets';
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

interface ComponentPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  isOpen,
  onClose,
}) => {
  const addNode = useSchematicStore((s) => s.addNode);
  const activePreset = useSchematicStore((s) => s.activePreset);
  const loadPreset = useSchematicStore((s) => s.loadPreset);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = PALETTE_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddItem = (type: ComponentType, subType?: string) => {
    addNode(type, subType);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-20 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none shadow-2xl md:shadow-none transition-all duration-300 ease-in-out ${
          isOpen
            ? 'translate-x-0 w-80 max-w-[85vw] md:w-64'
            : '-translate-x-full md:w-0 md:overflow-hidden md:border-r-0'
        }`}
      >
        <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Paleta de Elementos
          </span>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer active:scale-95"
            title="Cerrar paleta"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="md:hidden p-3 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
            Cargar Circuito Preconfigurado
          </div>
          <div className="flex items-center gap-2">
            <select
              value={activePreset}
              onChange={(e) => {
                loadPreset(e.target.value);
                onClose();
              }}
              className="flex-1 bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-2 focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer"
            >
              {Object.values(PRESET_CIRCUITS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                loadPreset(activePreset);
                onClose();
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Restablecer circuito"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-2.5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar elemento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 text-xs text-slate-200 placeholder-slate-500 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 focus:outline-hidden focus:border-amber-500/50"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedCategory('protection')}
              className={`px-2 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'protection'
                  ? 'bg-sky-500/20 text-sky-300 font-semibold border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              Protección
            </button>
            <button
              onClick={() => setSelectedCategory('switch')}
              className={`px-2 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'switch'
                  ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              Mandos
            </button>
            <button
              onClick={() => setSelectedCategory('load')}
              className={`px-2 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'load'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              Cargas
            </button>
            <button
              onClick={() => setSelectedCategory('junction')}
              className={`px-2 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                selectedCategory === 'junction'
                  ? 'bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/40'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-800/60'
              }`}
            >
              Bornas
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No se encontraron elementos
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={`${item.name}-${item.subType || ''}`}
                onClick={() => handleAddItem(item.type, item.subType)}
                className="w-full min-h-[48px] flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 active:bg-slate-700/80 border border-slate-800 hover:border-slate-700 active:scale-[0.98] text-left transition cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-slate-900 group-hover:scale-110 transition shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-200 truncate">{item.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                </div>
                <div className="p-1 rounded-md bg-slate-900/80 text-slate-400 group-hover:text-amber-400 shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
};
