import React from 'react';
import { X, Zap, Shield, Split, GitCommit, CheckCircle2, AlertOctagon } from 'lucide-react';

export const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Guía de Simulación Eléctrica & Multifilar
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5 text-xs text-slate-300 leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              1. Código de Colores de Conductores
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-200">Fase (L)</div>
                  <div className="text-[10px] text-slate-400">Marrón / Negro</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
                <div>
                  <div className="font-bold text-slate-200">Neutro (N)</div>
                  <div className="text-[10px] text-slate-400">Azul Claro</div>
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <div className="font-bold text-slate-200">Tierra (PE)</div>
                  <div className="text-[10px] text-slate-400">Verde-Amarillo</div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-indigo-400 text-sm flex items-center gap-1.5">
              <Split className="w-4 h-4" />
              2. Esquema de Conmutada (2 Puntos de Mando)
            </h3>
            <p>
              Para controlar un punto de luz desde dos sitios distintos (ej: extremos de un pasillo o cama):
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li>La <strong>Fase activa</strong> entra en el borne <strong>COM (Común)</strong> del primer conmutador.</li>
              <li>Los bornes <strong>L1 y L2</strong> del primer conmutador se unen con <strong>L1 y L2</strong> del segundo mediante los <em>hilos viajeros</em>.</li>
              <li>El <strong>COM (Común)</strong> del segundo conmutador va al borne de fase de la bombilla (vuelta de lámpara).</li>
              <li>El <strong>Neutro</strong> retorna directo al cuadro de protecciones.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-violet-400 text-sm flex items-center gap-1.5">
              <GitCommit className="w-4 h-4" />
              3. Conmutada de Cruce (3 o más Puntos de Mando)
            </h3>
            <p>
              Intercala una llave de <strong>Cruzamiento</strong> entre los dos conmutadores de extremo. Los dos hilos viajeros entran en Ent1/Ent2 y salen por Sal1/Sal2, permitiendo invertir la polaridad de las vías en cada pulsación.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-rose-400 text-sm flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4" />
              4. Detección y Protección de Cortocircuitos
            </h3>
            <p>
              Si unes directamente Fase (L) con Neutro (N) o Tierra (PE) sin pasar por una carga, el simulador detecta resistencia nula: la corriente tiende a infinito, se visualiza el fallo de corto en los conductores y el disyuntor magnetotérmico aguas arriba se dispara automáticamente cortando el suministro.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-sky-400 text-sm flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              5. Secciones de Conductor vs Amperaje
            </h3>
            <p>
              El motor de validación comprueba la coordinación térmica según normativa:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-400">
              <li><strong>1.5 mm²</strong>: Máximo 16A (calibre habitual 10A para alumbrado).</li>
              <li><strong>2.5 mm²</strong>: Máximo 20A (calibre habitual 16A para tomas de corriente).</li>
              <li><strong>4.0 mm²</strong>: Máximo 25A (lavadora, termo, lavavajillas).</li>
              <li><strong>6.0 mm²</strong>: Máximo 32A (placa de inducción y horno).</li>
            </ul>
          </section>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Entendido, ir al Simulador
          </button>
        </div>
      </div>
    </div>
  );
};
