import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Trash2,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
} from 'lucide-react';
import { useSchematicStore } from '../../store/schematicStore';
import type {
  BreakerComponent,
  CableData,
  LoadComponent,
  SwitchComponent,
} from '../../types/electrical';

export const DiagnosticsPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'inspector'>('diagnostics');

  const validationErrors = useSchematicStore((s) => s.validationErrors);
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const selectedNodeId = useSchematicStore((s) => s.selectedNodeId);
  const updateNodeData = useSchematicStore((s) => s.updateNodeData);
  const removeNode = useSchematicStore((s) => s.removeNode);
  const updateEdgeData = useSchematicStore((s) => s.updateEdgeData);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const totalWatts = nodes
    .filter((n) => n.data.type === 'load' && (n.data as LoadComponent).isOn)
    .reduce((sum, n) => sum + ((n.data as LoadComponent).ratedPowerWatts || 0), 0);

  const totalAmps = Number((totalWatts / 230).toFixed(2));

  const criticalErrors = validationErrors.filter(
    (e) => e.severity === 'critical' || e.severity === 'error'
  );
  const warnings = validationErrors.filter(
    (e) => e.severity === 'warning' || e.severity === 'info'
  );

  return (
    <div className="bg-slate-900 border-t border-slate-800 transition-all select-none z-20">
      <div className="h-10 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`flex items-center gap-1.5 text-xs font-bold transition py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Validación & REBT</span>
            {criticalErrors.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/40">
                {criticalErrors.length}
              </span>
            ) : warnings.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                {warnings.length}
              </span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1.5 text-xs font-bold transition py-1 px-2 rounded-lg cursor-pointer ${
              activeTab === 'inspector'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Inspector {selectedNode ? `(${selectedNode.data.name})` : ''}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              Carga Activa: <strong className="text-amber-400 font-bold">{totalWatts} W</strong>
            </span>
            <span className="text-slate-400">
              Intensidad: <strong className="text-emerald-400 font-bold">{totalAmps} A</strong>
            </span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="h-44 overflow-y-auto p-3">
          {activeTab === 'diagnostics' && (
            <div className="space-y-2">
              {validationErrors.length === 0 ? (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold">Circuito validado correctamente</div>
                    <div className="text-[11px] text-emerald-400/80">
                      No se detectan cortocircuitos directos, sobreintensidades de cable ni derivaciones.
                    </div>
                  </div>
                </div>
              ) : (
                validationErrors.map((err) => (
                  <div
                    key={err.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs ${
                      err.severity === 'critical'
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                        : err.severity === 'error'
                        ? 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                        : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    }`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        err.severity === 'critical'
                          ? 'text-rose-400 animate-bounce'
                          : 'text-amber-400'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-bold flex items-center gap-2">
                        <span>{err.title}</span>
                        <span className="text-[10px] uppercase font-mono px-1 rounded bg-black/40">
                          {err.code}
                        </span>
                      </div>
                      <div className="text-[11px] mt-0.5 text-slate-300">{err.message}</div>
                      {err.suggestedFix && (
                        <div className="mt-1 text-[11px] text-amber-300/90 font-mono bg-black/30 p-1.5 rounded">
                          Solución: {err.suggestedFix}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'inspector' && (
            <div>
              {selectedNode ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Configuración de {selectedNode.data.name}
                    </span>
                    <button
                      onClick={() => removeNode(selectedNode.id)}
                      className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar Nodo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Nombre / Identificador</label>
                      <input
                        type="text"
                        value={selectedNode.data.name}
                        onChange={(e) => updateNodeData(selectedNode.id, { name: e.target.value })}
                        className="w-full bg-slate-800 text-xs text-white border border-slate-700 rounded-lg p-1.5 focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    {selectedNode.data.type === 'breaker' && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Calibre Nominal (In)</label>
                        <select
                          value={(selectedNode.data as BreakerComponent).ratedCurrent}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              ratedCurrent: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-800 text-xs text-white border border-slate-700 rounded-lg p-1.5 cursor-pointer"
                        >
                          <option value="10">10 A (Alumbrado)</option>
                          <option value="16">16 A (Tomas de Corriente)</option>
                          <option value="20">20 A (Lavadora / Termo)</option>
                          <option value="25">25 A (Cocina / Horno)</option>
                          <option value="32">32 A (Climatización)</option>
                          <option value="40">40 A (IGA Principal)</option>
                        </select>
                      </div>
                    )}

                    {selectedNode.data.type === 'load' && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Potencia Nominal (Watts)</label>
                        <input
                          type="number"
                          value={(selectedNode.data as LoadComponent).ratedPowerWatts}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              ratedPowerWatts: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-800 text-xs text-white border border-slate-700 rounded-lg p-1.5"
                        />
                      </div>
                    )}

                    {selectedNode.data.type === 'switch' && (
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Tipo de Mecanismo</label>
                        <select
                          value={(selectedNode.data as SwitchComponent).switchType}
                          onChange={(e) =>
                            updateNodeData(selectedNode.id, {
                              switchType: e.target.value as SwitchComponent['switchType'],
                            })
                          }
                          className="w-full bg-slate-800 text-xs text-white border border-slate-700 rounded-lg p-1.5 cursor-pointer"
                        >
                          <option value="single_pole">Interruptor Unipolar</option>
                          <option value="two_way">Conmutador</option>
                          <option value="intermediate">Cruzamiento</option>
                          <option value="pushbutton">Pulsador</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ) : edges.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200">
                    Propiedades de Conductores Eléctricos
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Haz clic en un conductor o selecciona un nodo del esquema para editar sus parámetros físicos y eléctricos.
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[1.5, 2.5, 4.0, 6.0].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => {
                          for (const edge of edges) {
                            updateEdgeData(edge.id, { crossSectionMm2: sec });
                          }
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left text-xs transition cursor-pointer"
                      >
                        <div className="font-bold text-amber-400">{sec} mm²</div>
                        <div className="text-[10px] text-slate-400">
                          {sec === 1.5 ? '10A - Alumbrado' : sec === 2.5 ? '16A - Tomas' : sec === 4.0 ? '20A - Especiales' : '25A - Potencia'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-4">
                  Selecciona un elemento en el lienzo para inspeccionar sus características técnicas.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
