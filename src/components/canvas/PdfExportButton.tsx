import React, { useState, useRef, useEffect } from 'react';
import { FileDown, ChevronDown, Check, FileText, Layers } from 'lucide-react';
import { useSchematicStore } from '../../store/schematicStore';
import { exportUnifilarPdf, exportMultifilarPdf } from '../../engine/pdfExport';
import { PRESET_CIRCUITS } from '../../engine/presets';

export const PdfExportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingType, setDownloadingType] = useState<'unifilar' | 'multifilar' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const activePreset = useSchematicStore((s) => s.activePreset);

  const circuitName = activePreset && PRESET_CIRCUITS[activePreset]
    ? PRESET_CIRCUITS[activePreset].name
    : 'Circuito Actual';

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, [isOpen]);

  const handleExport = (type: 'unifilar' | 'multifilar') => {
    setDownloadingType(type);
    try {
      if (type === 'unifilar') {
        exportUnifilarPdf(nodes, edges, circuitName);
      } else {
        exportMultifilarPdf(nodes, edges, circuitName);
      }
    } catch (err) {
      console.error('Error al generar PDF:', err);
    } finally {
      setTimeout(() => {
        setDownloadingType(null);
        setIsOpen(false);
      }, 500);
    }
  };

  return (
    <div ref={containerRef} className="absolute top-3 right-3 z-10">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 active:bg-slate-700 text-slate-100 font-semibold text-xs border border-slate-700/80 shadow-xl shadow-slate-950/60 backdrop-blur-md transition cursor-pointer active:scale-95 group"
        title="Exportar esquema del circuito actual a PDF"
      >
        <FileDown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
        <span>Exportar PDF</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900/98 border border-slate-700/90 shadow-2xl p-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
          <div className="px-2.5 py-2 border-b border-slate-800">
            <div className="text-[11px] font-bold text-slate-200">
              Exportar Esquema Eléctrico
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              Simbología normalizada UNE-EN 60617 / REBT
            </div>
          </div>

          <div className="p-1 space-y-1">
            {/* Opción Unifilar */}
            <button
              type="button"
              onClick={() => handleExport('unifilar')}
              disabled={downloadingType !== null}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/90 active:bg-slate-800 text-left transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-800/60 flex items-center justify-center shrink-0 group-hover:border-sky-500 transition">
                {downloadingType === 'unifilar' ? (
                  <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                ) : (
                  <FileText className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition">
                    Esquema Unifilar
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-sky-950 text-sky-300 rounded border border-sky-800">
                    PDF A4
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Un solo trazo con canalizaciones, número de conductores (// o ///) y simbología de bloques.
                </div>
              </div>
            </button>

            {/* Opción Multifilar */}
            <button
              type="button"
              onClick={() => handleExport('multifilar')}
              disabled={downloadingType !== null}
              className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-800/90 active:bg-slate-800 text-left transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center shrink-0 group-hover:border-indigo-500 transition">
                {downloadingType === 'multifilar' ? (
                  <Check className="w-4 h-4 text-emerald-400 animate-bounce" />
                ) : (
                  <Layers className="w-4 h-4 text-indigo-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-amber-300 transition">
                    Esquema Multifilar
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-indigo-950 text-indigo-300 rounded border border-indigo-800">
                    PDF A4
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                  Todos los conductores (Fase L, Neutro N, Tierra PE) con conexionado real de bornes.
                </div>
              </div>
            </button>
          </div>

          <div className="px-2.5 py-1.5 border-t border-slate-800 text-[9px] text-slate-400 font-mono text-center">
            Incluye cajetín técnico oficial de proyecto
          </div>
        </div>
      )}
    </div>
  );
};
