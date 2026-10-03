import React, { useState, useEffect } from 'react';
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
  WireType,
} from '../../types/electrical';

export const DiagnosticsPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'inspector'>('diagnostics');
  const [isPulsing, setIsPulsing] = useState(false);

  const validationErrors = useSchematicStore((s) => s.validationErrors);
  const nodes = useSchematicStore((s) => s.nodes);
  const edges = useSchematicStore((s) => s.edges);
  const selectedNodeId = useSchematicStore((s) => s.selectedNodeId);
  const selectedEdgeId = useSchematicStore((s) => s.selectedEdgeId);
  const updateNodeData = useSchematicStore((s) => s.updateNodeData);
  const removeNode = useSchematicStore((s) => s.removeNode);
  const updateEdgeData = useSchematicStore((s) => s.updateEdgeData);
  const removeEdge = useSchematicStore((s) => s.removeEdge);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId);

  useEffect(() => {
    if (selectedNodeId || selectedEdgeId) {
      setActiveTab('inspector');
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedNodeId, selectedEdgeId]);

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

  const handleTabClick = (tab: 'diagnostics' | 'inspector') => {
    if (activeTab === tab && isExpanded) {
      setIsExpanded(false);
    } else {
      setActiveTab(tab);
      setIsExpanded(true);
    }
  };

  const getSectionMaxAmps = (section: number) => {
    if (section >= 25) return 80;
    if (section >= 16) return 63;
    if (section >= 10) return 40;
    if (section >= 6) return 25;
    if (section >= 4) return 20;
    if (section >= 2.5) return 16;
    return 10;
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 transition-all select-none z-20">
      <div
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className="h-10 px-2 sm:px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 cursor-pointer"
      >
        <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTabClick('diagnostics');
            }}
            className={`flex items-center gap-1.5 text-xs font-bold transition py-1.5 px-2 rounded-lg cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>Validación <span className="hidden xs:inline">& REBT</span></span>
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
            onClick={(e) => {
              e.stopPropagation();
              handleTabClick('inspector');
            }}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all py-1.5 px-2.5 rounded-lg cursor-pointer ${
              activeTab === 'inspector'
                ? 'bg-slate-800 text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            } ${
              isPulsing
                ? 'ring-2 ring-amber-400 bg-amber-500/25 text-amber-300 shadow-md shadow-amber-500/40 animate-pulse'
                : ''
            }`}
          >
            <Sliders className="w-3.5 h-3.5 shrink-0" />
            <span>
              Inspector{' '}
              {selectedNode ? (
                <span className="hidden sm:inline">({selectedNode.data.name})</span>
              ) : selectedEdge ? (
                <span className="hidden sm:inline">(Cable {selectedEdge.data?.crossSectionMm2}mm²)</span>
              ) : (
                ''
              )}
            </span>
            {isPulsing && (
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/30 px-1.5 py-0.2 rounded border border-amber-500/50">
                ¡Edita o borra aquí!
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              Carga: <strong className="text-amber-400 font-bold">{totalWatts} W</strong>
            </span>
            <span className="text-slate-400">
              Intensidad: <strong className="text-emerald-400 font-bold">{totalAmps} A</strong>
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? 'Plegar panel' : 'Desplegar panel'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="h-48 overflow-y-auto p-3">
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
            <div className="space-y-3">
              {selectedNode ? (
                <div className={`p-3 rounded-xl border transition-all ${isPulsing ? 'border-amber-500/60 bg-amber-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-200">
                      Configuración de {selectedNode.data.name}
                    </span>
                    <button
                      onClick={() => removeNode(selectedNode.id)}
                      className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 px-3 py-1.5 rounded-lg border border-rose-500/30 transition cursor-pointer active:scale-95 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar Componente
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
              ) : selectedEdge ? (
                <div className={`p-3 rounded-xl border transition-all ${isPulsing ? 'border-amber-500/60 bg-amber-500/5' : 'border-slate-800 bg-slate-900/60'}`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Configuración de Cable / Conductor
                      </span>
                    </div>
                    <button
                      onClick={() => removeEdge(selectedEdge.id)}
                      className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 px-3 py-1.5 rounded-lg border border-rose-500/30 transition cursor-pointer active:scale-95 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Eliminar Cable
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Tipo de Conductor / Función</label>
                      <select
                        value={selectedEdge.data?.wireType || 'phase'}
                        onChange={(e) =>
                          updateEdgeData(selectedEdge.id, {
                            wireType: e.target.value as WireType,
                          })
                        }
                        className="w-full bg-slate-800 text-xs text-white border border-slate-700 rounded-lg p-1.5 cursor-pointer"
                      >
                        <option value="phase">Fase - Marrón / Negro / Gris (L)</option>
                        <option value="neutral">Neutro - Azul (N)</option>
                        <option value="ground">Protección PE - Verde-Amarillo</option>
                        <option value="switched_phase">Vuelta de Lámpara - Gris / Marrón</option>
                        <option value="traveler">Viajero de Conmutada - Naranja / Negro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Sección de Cobre (mm²)</label>
                      {(() => {
                        const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
                        const targetNode = nodes.find((n) => n.id === selectedEdge.target);
                        const isConnectedToSocket =
                          (sourceNode?.data.type === 'load' && (sourceNode.data as LoadComponent).loadType === 'socket') ||
                          (targetNode?.data.type === 'load' && (targetNode.data as LoadComponent).loadType === 'socket');

                        return (
                          <select
                            value={selectedEdge.data?.crossSectionMm2 || 1.5}
                            onChange={(e) => {
                              const sec = Number(e.target.value);
                              updateEdgeData(selectedEdge.id, {
                                crossSectionMm2: sec,
                                maxAllowedCurrentAmps: getSectionMaxAmps(sec),
                              });
                            }}
                            className={`w-full bg-slate-800 text-xs text-white border rounded-lg p-1.5 cursor-pointer ${
                              isConnectedToSocket && (selectedEdge.data?.crossSectionMm2 || 1.5) < 2.5
                                ? 'border-rose-500 ring-2 ring-rose-500/40 text-rose-300 font-bold'
                                : 'border-slate-700'
                            }`}
                          >
                            <option value="1.5">
                              {isConnectedToSocket
                                ? '❌ 1.5 mm² (Antirreglamentario para tomas - Solo Alumbrado)'
                                : '1.5 mm² (Alumbrado C1 - Máx 10A / 15A Iz)'}
                            </option>
                            <option value="2.5">2.5 mm² (Tomas de Corriente C2/C5 - Mínimo REBT - Máx 16A / 21A Iz)</option>
                            <option value="4.0">4.0 mm² (Lavadora / Termo C4 - Máx 20A / 28A Iz)</option>
                            <option value="6.0">6.0 mm² (Cocina / Horno C3 - Máx 25A / 36A Iz)</option>
                            <option value="10.0">10.0 mm² (Derivación Individual - Máx 40A / 50A Iz)</option>
                            <option value="16.0">16.0 mm² (Alta Potencia / IGA - Máx 63A / 66A Iz)</option>
                            <option value="25.0">25.0 mm² (Acometida / LGA - Máx 80A / 89A Iz)</option>
                          </select>
                        );
                      })()}
                    </div>

                    <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-2 flex flex-col justify-center gap-1 text-[11px] font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tensión:</span>
                        <span className={selectedEdge.data?.isEnergized ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {selectedEdge.data?.isEnergized ? '230V AC' : '0V'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Intensidad:</span>
                        <span className={selectedEdge.data?.hasCurrent ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                          {selectedEdge.data?.hasCurrent
                            ? selectedEdge.data.measuredCurrentAmps
                              ? `${selectedEdge.data.measuredCurrentAmps.toFixed(2)} A`
                              : 'Activa'
                            : '0.00 A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capacidad máx:</span>
                        <span className="text-sky-400 font-bold">
                          {selectedEdge.data?.maxAllowedCurrentAmps || 16} A
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Banner de Infracción de Sección si procede */}
                  {(() => {
                    const edgeError = validationErrors.find(
                      (err) => err.edgeIds.includes(selectedEdge.id) && err.code === 'UNDERSIZED_CABLE'
                    );
                    if (!edgeError) return null;

                    const targetFixSection = (() => {
                      const measured = selectedEdge.data?.measuredCurrentAmps || 0;
                      if (measured > 66) return 25.0;
                      if (measured > 50) return 16.0;
                      if (measured > 36) return 10.0;
                      if (measured > 28) return 6.0;
                      if (measured > 21) return 4.0;
                      if (measured > 0) return 2.5;

                      const src = nodes.find((n) => n.id === selectedEdge.source);
                      const tgt = nodes.find((n) => n.id === selectedEdge.target);
                      const loadNode = src?.data.type === 'load' ? src : tgt?.data.type === 'load' ? tgt : null;
                      if (loadNode) {
                        const l = loadNode.data as LoadComponent;
                        const dAmps = l.ratedPowerWatts / 230;
                        if (dAmps > 66) return 25.0;
                        if (dAmps > 50) return 16.0;
                        if (dAmps > 36) return 10.0;
                        if (dAmps > 28) return 6.0;
                        if (dAmps > 21) return 4.0;
                        if (l.loadType === 'socket') return 2.5;
                      }

                      const brkNode = src?.data.type === 'breaker' ? src : tgt?.data.type === 'breaker' ? tgt : null;
                      if (brkNode) {
                        const b = brkNode.data as BreakerComponent;
                        if (b.ratedCurrent > 40) return 16.0;
                        if (b.ratedCurrent > 25) return 10.0;
                        if (b.ratedCurrent > 20) return 6.0;
                        if (b.ratedCurrent > 16) return 4.0;
                        if (b.ratedCurrent > 10) return 2.5;
                      }

                      return 2.5;
                    })();

                    return (
                      <div className="mt-3 p-3 bg-rose-950/60 border border-rose-500/80 rounded-xl text-xs space-y-2">
                        <div className="flex items-center gap-2 text-rose-300 font-bold">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{edgeError.title}</span>
                        </div>
                        <p className="text-[11px] text-rose-200/90 leading-relaxed">
                          {edgeError.message}
                        </p>
                        <button
                          onClick={() => {
                            updateEdgeData(selectedEdge.id, {
                              crossSectionMm2: targetFixSection,
                              maxAllowedCurrentAmps: getSectionMaxAmps(targetFixSection),
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition active:scale-95 shadow-md shadow-rose-950/50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Corregir a {targetFixSection} mm² Reglamentario (REBT)</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              ) : edges.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-200">
                    Propiedades Generales de Cableado
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Haz clic directamente en un cable o en un componente del esquema para editar sus parámetros individuales o eliminarlo.
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {[1.5, 2.5, 4.0, 6.0, 10.0, 16.0].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => {
                          for (const edge of edges) {
                            const srcNode = nodes.find((n) => n.id === edge.source);
                            const tgtNode = nodes.find((n) => n.id === edge.target);
                            const isSocketEdge =
                              (srcNode?.data.type === 'load' && (srcNode.data as LoadComponent).loadType === 'socket') ||
                              (tgtNode?.data.type === 'load' && (tgtNode.data as LoadComponent).loadType === 'socket');
                            const targetSection = (sec < 2.5 && isSocketEdge) ? 2.5 : sec;

                            updateEdgeData(edge.id, {
                              crossSectionMm2: targetSection,
                              maxAllowedCurrentAmps: getSectionMaxAmps(targetSection),
                            });
                          }
                        }}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left text-xs transition cursor-pointer"
                      >
                        <div className="font-bold text-amber-400">{sec} mm²</div>
                        <div className="text-[10px] text-slate-400">
                          {sec === 1.5
                            ? '15A Iz (C1 Luz)'
                            : sec === 2.5
                            ? '21A Iz (C2 Tomas)'
                            : sec === 4.0
                            ? '28A Iz (C4)'
                            : sec === 6.0
                            ? '36A Iz (C3)'
                            : sec === 10.0
                            ? '50A Iz (IGA)'
                            : '66A Iz (Potencia)'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 text-center py-6">
                  Haz clic sobre un componente o sobre un cable para ver sus propiedades, editarlo o eliminarlo.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
