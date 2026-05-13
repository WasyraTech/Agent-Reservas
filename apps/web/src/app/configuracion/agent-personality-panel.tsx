"use client";

import Link from "next/link";
import type { ChangeEvent, RefObject } from "react";

import { AgentConfigCard } from "./agent-config-card";
import { BUSINESS_TYPE_LABELS_ES, COMMON_TIMEZONES } from "./configuracion-types";
import { inputClass, textareaClass } from "./configuracion-constants";
import { IconBot } from "./configuracion-icons";
import { ClosedDatesEditor } from "./closed-dates-editor";
import { RequiredFieldsEditor } from "./required-fields-editor";
import { ScheduleWeekEditor } from "./schedule-week-editor";
import { ServicesListEditor } from "./services-list-editor";
import { WelcomeMenuSimpleEditor } from "./welcome-menu-simple-editor";

type Props = {
  catalogFileInputRef: RefObject<HTMLInputElement | null>;
  onCatalogFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  catalogImportMode: "append" | "replace";
  onCatalogImportMode: (m: "append" | "replace") => void;
  catalogImporting: boolean;

  businessName: string;
  onBusinessName: (v: string) => void;
  businessType: string;
  onBusinessType: (v: string) => void;
  businessTimezone: string;
  onBusinessTimezone: (v: string) => void;
  businessAddress: string;
  onBusinessAddress: (v: string) => void;
  businessPhoneDisplay: string;
  onBusinessPhoneDisplay: (v: string) => void;
  businessTypeChoices: string[];

  agentBusinessSummary: string;
  onAgentBusinessSummary: (v: string) => void;

  workingHoursJson: string;
  onWorkingHoursJson: (v: string) => void;
  closedDatesJson: string;
  onClosedDatesJson: (v: string) => void;

  servicesJson: string;
  onServicesJson: (v: string) => void;
  agentCatalog: string;
  onAgentCatalog: (v: string) => void;

  defaultDurationMin: number;
  onDefaultDurationMin: (v: number) => void;
  slotStepMin: number;
  onSlotStepMin: (v: number) => void;
  minLeadTimeMin: number;
  onMinLeadTimeMin: (v: number) => void;
  maxAdvanceDays: number;
  onMaxAdvanceDays: (v: number) => void;
  bufferMin: number;
  onBufferMin: (v: number) => void;
  requiresIdDocument: boolean;
  onRequiresIdDocument: (v: boolean) => void;

  welcomeMessage: string;
  onWelcomeMessage: (v: string) => void;
  welcomeMenuOptionsJson: string;
  onWelcomeMenuOptionsJson: (v: string) => void;

  cancellationPolicy: string;
  onCancellationPolicy: (v: string) => void;
  appointmentRequiredFieldsJson: string;
  onAppointmentRequiredFieldsJson: (v: string) => void;
  agentLeadCapture: string;
  onAgentLeadCapture: (v: string) => void;

  agentPricingRules: string;
  onAgentPricingRules: (v: string) => void;
  agentPaymentMethods: string;
  onAgentPaymentMethods: (v: string) => void;
  agentShippingZones: string;
  onAgentShippingZones: (v: string) => void;
  agentFaq: string;
  onAgentFaq: (v: string) => void;
  agentOffHoursMessage: string;
  onAgentOffHoursMessage: (v: string) => void;
  agentHardRules: string;
  onAgentHardRules: (v: string) => void;
  agentInstructions: string;
  onAgentInstructions: (v: string) => void;
};

export function AgentPersonalityPanel(props: Props) {
  const businessTypeChoices = props.businessTypeChoices?.length
    ? props.businessTypeChoices
    : Object.keys(BUSINESS_TYPE_LABELS_ES);

  return (
    <section
      role="tabpanel"
      aria-labelledby="tab-agent"
      className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#1a2830] via-[var(--wa-panel)] to-[#151d24] p-1 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04] sm:p-2"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[var(--wa-accent)]/12 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 rounded-full bg-violet-600/15 blur-3xl"
      />

      <div className="relative rounded-[1.35rem] border border-white/[0.05] bg-black/20 px-4 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--wa-accent)]/35 via-violet-500/25 to-sky-600/30 text-white shadow-lg ring-1 ring-white/20">
              <IconBot className="h-7 w-7" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--wa-accent-soft)]/90">
                Panel de agendamiento
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--wa-text)] sm:text-3xl">
                Tu recepcionista inteligente
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--wa-text-muted)]">
                Sin JSON ni hojas de cálculo obligatorias: horarios con interruptores, servicios con botones y menú
                claro para WhatsApp. Todo se guarda y alimenta al bot. Después prueba en{" "}
                <Link href="/citas" className="font-medium text-[var(--wa-link)] underline decoration-[var(--wa-link)]/40 underline-offset-2 hover:decoration-[var(--wa-link)]">
                  Citas
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-[var(--wa-accent)]/25 bg-[var(--wa-accent)]/10 px-4 py-3 text-xs leading-relaxed text-[var(--wa-text)] sm:max-w-xs">
            <p className="font-semibold text-[var(--wa-accent-soft)]">Flujo típico</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[var(--wa-text-muted)]">
              <li>Saludo + 2 opciones + agendar.</li>
              <li>El bot usa Calendar y herramientas de cita.</li>
            </ol>
          </div>
        </div>

        <div className="mt-10 space-y-6 sm:space-y-7">
          <AgentConfigCard
            step="01 · Identidad"
            title="Datos del negocio"
            hint="Nombre, rubro y contacto que el asistente puede citar con confianza."
            accent="emerald"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-[var(--wa-text-muted)]">Nombre comercial</span>
                <input
                  className={inputClass}
                  value={props.businessName}
                  onChange={(e) => props.onBusinessName(e.target.value)}
                  placeholder="Clínica Dental Sonrisa"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--wa-text-muted)]">Tipo de negocio</span>
                <select
                  className={inputClass}
                  value={props.businessType}
                  onChange={(e) => props.onBusinessType(e.target.value)}
                >
                  <option value="">— Elegir —</option>
                  {businessTypeChoices.map((k) => (
                    <option key={k} value={k}>
                      {BUSINESS_TYPE_LABELS_ES[k] ?? k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--wa-text-muted)]">Zona horaria</span>
                <select
                  className={inputClass}
                  value={props.businessTimezone}
                  onChange={(e) => props.onBusinessTimezone(e.target.value)}
                >
                  {[props.businessTimezone, ...COMMON_TIMEZONES]
                    .filter((tz, i, arr) => tz && arr.indexOf(tz) === i)
                    .map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--wa-text-muted)]">Teléfono visible</span>
                <input
                  className={inputClass}
                  value={props.businessPhoneDisplay}
                  onChange={(e) => props.onBusinessPhoneDisplay(e.target.value)}
                  placeholder="+51 999 999 999"
                />
              </label>
            </div>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-[var(--wa-text-muted)]">Dirección</span>
              <textarea
                className={textareaClass}
                value={props.businessAddress}
                onChange={(e) => props.onBusinessAddress(e.target.value)}
                placeholder="Av. Principal 123, Lima"
                rows={2}
              />
            </label>
          </AgentConfigCard>

          <AgentConfigCard
            step="02 · Resumen"
            title="Descripción del negocio"
            hint="Un párrafo claro: qué ofrecen, a quién atienden y qué los diferencia."
            accent="violet"
          >
            <textarea
              className={textareaClass}
              value={props.agentBusinessSummary}
              onChange={(e) => props.onAgentBusinessSummary(e.target.value)}
              placeholder="Ej.: Clínica dental familiar. Limpiezas, ortodoncia, planes de pago y seguros."
              rows={3}
              spellCheck
            />
          </AgentConfigCard>

          <AgentConfigCard
            step="03 · Horarios"
            title="Semana y feriados"
            hint="Interruptor por día, horas de mañana y tarde (2º turno = horario partido). Abajo añade feriados con el calendario."
            accent="emerald"
          >
            <ScheduleWeekEditor
              workingHoursJson={props.workingHoursJson}
              onWorkingHoursJson={props.onWorkingHoursJson}
            />
            <div className="mt-6">
              <ClosedDatesEditor
                closedDatesJson={props.closedDatesJson}
                onClosedDatesJson={props.onClosedDatesJson}
              />
            </div>
          </AgentConfigCard>

          <AgentConfigCard
            step="04 · Servicios"
            title="Tratamientos y duraciones"
            hint="Lista visual: nombre, minutos, precio en texto libre y si pide depósito. Si prefieres tabla Excel o CSV, úsalo en «Importar» (texto de respaldo)."
            accent="violet"
          >
            <ServicesListEditor servicesJson={props.servicesJson} onServicesJson={props.onServicesJson} />
            <details className="group/details mt-6 rounded-2xl border border-dashed border-white/15 bg-black/25 px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-medium text-[var(--wa-text)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--wa-text-muted)]">
                    Opcional
                  </span>
                  Importar catálogo desde Excel o CSV
                </span>
              </summary>
              <p className="mt-3 text-xs leading-relaxed text-[var(--wa-text-muted)]">
                No es obligatorio saber qué es un CSV: es solo una hoja de cálculo exportada. Si importas, el texto
                aparece abajo y el bot lo usa si la lista de servicios de arriba está vacía.
              </p>
              <input
                ref={props.catalogFileInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={props.onCatalogFileChange}
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex rounded-xl border border-white/10 bg-black/35 p-0.5">
                  <button
                    type="button"
                    onClick={() => props.onCatalogImportMode("append")}
                    className={[
                      "rounded-lg px-3 py-2 text-xs font-semibold transition",
                      props.catalogImportMode === "append"
                        ? "bg-[var(--wa-accent)] text-[#041016]"
                        : "text-[var(--wa-text-muted)] hover:text-[var(--wa-text)]",
                    ].join(" ")}
                  >
                    Añadir al texto
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onCatalogImportMode("replace")}
                    className={[
                      "rounded-lg px-3 py-2 text-xs font-semibold transition",
                      props.catalogImportMode === "replace"
                        ? "bg-amber-500/90 text-[#041016]"
                        : "text-[var(--wa-text-muted)] hover:text-[var(--wa-text)]",
                    ].join(" ")}
                  >
                    Reemplazar texto
                  </button>
                </div>
                <button
                  type="button"
                  disabled={props.catalogImporting}
                  onClick={() => props.catalogFileInputRef.current?.click()}
                  className="rounded-xl border border-violet-400/35 bg-violet-500/15 px-4 py-2 text-sm font-semibold text-violet-100 transition hover:bg-violet-500/25 disabled:opacity-50"
                >
                  {props.catalogImporting ? "Importando…" : "Elegir archivo…"}
                </button>
              </div>
              <textarea
                className={`${textareaClass} mt-3 min-h-[140px] font-mono text-[12px]`}
                value={props.agentCatalog}
                onChange={(e) => props.onAgentCatalog(e.target.value)}
                placeholder="Texto libre o filas importadas (celda | celda | …)"
                rows={5}
                spellCheck={false}
              />
            </details>
          </AgentConfigCard>

          <AgentConfigCard
            step="05 · Reglas"
            title="Cómo se reservan las citas"
            hint="Duración por defecto, espacio entre huecos y cuántos días hacia adelante se puede pedir cita."
            accent="amber"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Duración estándar (min)"
                value={props.defaultDurationMin}
                onChange={props.onDefaultDurationMin}
                min={5}
                max={480}
              />
              <NumberField
                label="Huecos cada (min)"
                value={props.slotStepMin}
                onChange={props.onSlotStepMin}
                min={5}
                max={120}
                help="Ej. 15 = ofrecer cada cuarto de hora"
              />
              <NumberField
                label="Antelación mínima (min)"
                value={props.minLeadTimeMin}
                onChange={props.onMinLeadTimeMin}
                min={0}
                max={20160}
                help="0 = permitir lo más pronto posible"
              />
              <NumberField
                label="Máx. días a futuro"
                value={props.maxAdvanceDays}
                onChange={props.onMaxAdvanceDays}
                min={1}
                max={365}
              />
              <NumberField
                label="Margen entre citas (min)"
                value={props.bufferMin}
                onChange={props.onBufferMin}
                min={0}
                max={240}
                help="Limpieza o cambio de sala"
              />
              <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={props.requiresIdDocument}
                  onChange={(e) => props.onRequiresIdDocument(e.target.checked)}
                  className="h-4 w-4 accent-[var(--wa-accent)]"
                />
                <span className="text-[var(--wa-text)]">Pedir documento de identidad</span>
              </label>
            </div>
          </AgentConfigCard>

          <AgentConfigCard
            step="06 · Bienvenida"
            title="Primer mensaje y menú"
            hint="El cliente ve un saludo y dos botones de información; el tercero siempre es agendar cita."
            accent="violet"
          >
            <WelcomeMenuSimpleEditor
              welcomeMessage={props.welcomeMessage}
              onWelcomeMessage={props.onWelcomeMessage}
              welcomeMenuOptionsJson={props.welcomeMenuOptionsJson}
              onWelcomeMenuOptionsJson={props.onWelcomeMenuOptionsJson}
            />
          </AgentConfigCard>

          <AgentConfigCard
            step="07 · Cancelaciones"
            title="Política de cancelación"
            hint="Qué puede decir el bot si piden anular o mover la cita."
            accent="emerald"
          >
            <textarea
              className={textareaClass}
              value={props.cancellationPolicy}
              onChange={(e) => props.onCancellationPolicy(e.target.value)}
              placeholder="Ej.: Reprogramar o cancelar con al menos 4 h de aviso…"
              rows={4}
              spellCheck
            />
          </AgentConfigCard>

          <AgentConfigCard
            step="08 · Datos del cliente"
            title="Qué pedir antes de confirmar"
            hint="Casillas para lo habitual; abajo puedes afinar con texto libre para el bot."
            accent="violet"
          >
            <RequiredFieldsEditor
              appointmentRequiredFieldsJson={props.appointmentRequiredFieldsJson}
              onAppointmentRequiredFieldsJson={props.onAppointmentRequiredFieldsJson}
            />
            <label className="mt-5 block text-sm">
              <span className="mb-1 block text-[var(--wa-text-muted)]">Instrucciones extra para el bot</span>
              <textarea
                className={textareaClass}
                value={props.agentLeadCapture}
                onChange={(e) => props.onAgentLeadCapture(e.target.value)}
                placeholder="Ej.: Si es primera vez, anótalo en notas. Si mencionan seguro, pregunta cuál."
                rows={4}
                spellCheck
              />
            </label>
          </AgentConfigCard>

          <AgentConfigCard
            step="09 · Pagos"
            title="Medios de pago y precios"
            hint="Yape, transferencia, tarjetas, depósitos."
            accent="amber"
          >
            <textarea
              className={textareaClass}
              value={props.agentPaymentMethods}
              onChange={(e) => props.onAgentPaymentMethods(e.target.value)}
              placeholder="Ej.: Efectivo, Yape al número…, tarjetas Visa/Mastercard…"
              rows={4}
              spellCheck
            />
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-[var(--wa-text-muted)]">Reglas de cotización (IGV, descuentos…)</span>
              <textarea
                className={textareaClass}
                value={props.agentPricingRules}
                onChange={(e) => props.onAgentPricingRules(e.target.value)}
                placeholder="Ej.: Precios con IGV. No prometer descuentos no autorizados."
                rows={3}
                spellCheck
              />
            </label>
          </AgentConfigCard>

          <AgentConfigCard
            step="10 · Ubicación"
            title="Cómo llegar o cobertura"
            hint="Referencias, estacionamiento, sucursales."
            accent="emerald"
          >
            <textarea
              className={textareaClass}
              value={props.agentShippingZones}
              onChange={(e) => props.onAgentShippingZones(e.target.value)}
              placeholder="Ej.: San Isidro, a una cuadra del óvalo…"
              rows={4}
              spellCheck
            />
          </AgentConfigCard>

          <AgentConfigCard
            step="11 · FAQs"
            title="Preguntas frecuentes"
            hint="Formato libre P: / R:"
            accent="violet"
          >
            <textarea
              className={`${textareaClass} min-h-[180px]`}
              value={props.agentFaq}
              onChange={(e) => props.onAgentFaq(e.target.value)}
              placeholder={"P: ¿Atienden niños?\nR: Sí, con cita previa."}
              rows={8}
              spellCheck
            />
          </AgentConfigCard>

          <AgentConfigCard
            step="12 · Fuera de horario"
            title="Mensaje si escriben cerrados"
            hint="Opcional: si lo dejas vacío, el bot improvisa según horarios."
            accent="emerald"
          >
            <textarea
              className={textareaClass}
              value={props.agentOffHoursMessage}
              onChange={(e) => props.onAgentOffHoursMessage(e.target.value)}
              placeholder="Ej.: Gracias por escribir. Respondemos al abrir…"
              rows={3}
              spellCheck
            />
          </AgentConfigCard>

          <AgentConfigCard
            step="13 · Límites"
            title="Lo que el bot no debe hacer"
            hint="Salud, legal, datos sensibles, promesas imposibles."
            accent="amber"
          >
            <textarea
              className={textareaClass}
              value={props.agentHardRules}
              onChange={(e) => props.onAgentHardRules(e.target.value)}
              placeholder="Ej.: No diagnosticar. No pedir datos de tarjeta completos."
              rows={4}
              spellCheck
            />
          </AgentConfigCard>

          <AgentConfigCard
            step="14 · Tono"
            title="Estilo de conversación"
            hint="Formal o cercano, emojis, longitud de mensajes."
            accent="violet"
          >
            <textarea
              className={textareaClass}
              value={props.agentInstructions}
              onChange={(e) => props.onAgentInstructions(e.target.value)}
              placeholder="Ej.: Tuteo, 1–3 frases, un emoji al saludar como máximo…"
              rows={5}
              spellCheck
            />
          </AgentConfigCard>
        </div>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  help?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-[var(--wa-text-muted)]">{label}</span>
      <input
        type="number"
        className={inputClass}
        value={Number.isFinite(value) ? value : ""}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isNaN(n)) {
            onChange(min);
          } else {
            onChange(Math.min(max, Math.max(min, n)));
          }
        }}
      />
      {help ? <span className="mt-1 block text-[11px] text-[var(--wa-text-muted)]">{help}</span> : null}
    </label>
  );
}
