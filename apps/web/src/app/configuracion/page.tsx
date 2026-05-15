"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AgentPersonalityPanel } from "./agent-personality-panel";
import { ConfiguracionClearSecretsModal, ConfiguracionResultModal } from "./configuracion-modals";
import { ConfiguracionFormActions } from "./configuracion-form-actions";
import { GEMINI_MODEL_CUSTOM, geminiModelSelectValue } from "./configuracion-constants";
import type { LlmProvider, Settings, SettingsTab } from "./configuracion-types";
import { LlmMotorSection } from "./llm-motor-section";
import { SettingsSectionNav } from "./settings-section-nav";
import { SettingsTabBar } from "./settings-tab-bar";
import { TwilioWhatsappSection } from "./twilio-whatsapp-section";
import { GoogleCalendarSection } from "./google-calendar-section";
import { WebhookUrlSection } from "./webhook-url-section";
import { usePanelToast } from "@/components/PanelToast";
import { PanelPageHeader } from "@/components/PanelPageHeader";

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [data, setData] = useState<Settings | null>(null);

  // --- credenciales / infra ---
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [webhookBaseUrl, setWebhookBaseUrl] = useState("");
  const [validateSignature, setValidateSignature] = useState(false);
  const [llmProvider, setLlmProvider] = useState<LlmProvider>("openai");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [twilioToken, setTwilioToken] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [googleCalendarId, setGoogleCalendarId] = useState("");
  const [googleServiceAccountJson, setGoogleServiceAccountJson] = useState("");

  // --- agente / negocio (texto libre legacy) ---
  const [agentBusinessSummary, setAgentBusinessSummary] = useState("");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [agentLeadCapture, setAgentLeadCapture] = useState("");
  const [agentCatalog, setAgentCatalog] = useState("");
  const [agentPricingRules, setAgentPricingRules] = useState("");
  const [agentShippingZones, setAgentShippingZones] = useState("");
  const [agentPaymentMethods, setAgentPaymentMethods] = useState("");
  const [agentReturnsWarranty, setAgentReturnsWarranty] = useState("");
  const [agentFaq, setAgentFaq] = useState("");
  const [agentOffHoursMessage, setAgentOffHoursMessage] = useState("");
  const [agentHardRules, setAgentHardRules] = useState("");

  // --- citas ---
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessTimezone, setBusinessTimezone] = useState("America/Lima");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhoneDisplay, setBusinessPhoneDisplay] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [welcomeMenuOptionsJson, setWelcomeMenuOptionsJson] = useState("");
  const [workingHoursJson, setWorkingHoursJson] = useState("");
  const [closedDatesJson, setClosedDatesJson] = useState("");
  const [servicesJson, setServicesJson] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [appointmentRequiredFieldsJson, setAppointmentRequiredFieldsJson] = useState("");
  const [defaultDurationMin, setDefaultDurationMin] = useState(30);
  const [slotStepMin, setSlotStepMin] = useState(15);
  const [minLeadTimeMin, setMinLeadTimeMin] = useState(60);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(30);
  const [bufferMin, setBufferMin] = useState(0);
  const [requiresIdDocument, setRequiresIdDocument] = useState(false);
  const [requireAppointmentConfirmation, setRequireAppointmentConfirmation] = useState(true);
  const [agentResponseLanguage, setAgentResponseLanguage] = useState("es");
  const [agentToneStyle, setAgentToneStyle] = useState("professional");
  const [reminderHoursBefore, setReminderHoursBefore] = useState(24);
  const [reminderMessageTemplate, setReminderMessageTemplate] = useState("");

  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [clearSecretsModalOpen, setClearSecretsModalOpen] = useState(false);
  const [catalogImportMode, setCatalogImportMode] = useState<"append" | "replace">("append");
  const [catalogImporting, setCatalogImporting] = useState(false);
  const catalogFileInputRef = useRef<HTMLInputElement>(null);
  const toast = usePanelToast();

  const applySettingsToState = useCallback((j: Settings) => {
    setData(j);
    setTwilioAccountSid(j.twilio_account_sid);
    setWebhookBaseUrl(j.webhook_base_url);
    setValidateSignature(j.twilio_validate_signature);
    setLlmProvider(j.llm_provider === "gemini" ? "gemini" : "openai");
    setOpenaiModel(j.openai_model);
    setGeminiModel(j.gemini_model);
    setTwilioToken("");
    setOpenaiKey("");
    setGeminiKey("");
    setAgentBusinessSummary(j.agent_business_summary ?? "");
    setAgentInstructions(j.agent_instructions ?? "");
    setAgentLeadCapture(j.agent_lead_capture ?? "");
    setAgentCatalog(j.agent_catalog ?? "");
    setAgentPricingRules(j.agent_pricing_rules ?? "");
    setAgentShippingZones(j.agent_shipping_zones ?? "");
    setAgentPaymentMethods(j.agent_payment_methods ?? "");
    setAgentReturnsWarranty(j.agent_returns_warranty ?? "");
    setAgentFaq(j.agent_faq ?? "");
    setAgentOffHoursMessage(j.agent_off_hours_message ?? "");
    setAgentHardRules(j.agent_hard_rules ?? "");
    setGoogleCalendarId(j.google_calendar_id ?? "");
    setGoogleServiceAccountJson("");
    setBusinessName(j.business_name ?? "");
    setBusinessType(j.business_type ?? "");
    setBusinessTimezone(j.business_timezone || "America/Lima");
    setBusinessAddress(j.business_address ?? "");
    setBusinessPhoneDisplay(j.business_phone_display ?? "");
    setWelcomeMessage(j.welcome_message ?? "");
    setWelcomeMenuOptionsJson(j.welcome_menu_options_json ?? "");
    setWorkingHoursJson(j.working_hours_json ?? "");
    setClosedDatesJson(j.closed_dates_json ?? "");
    setServicesJson(j.services_json ?? "");
    setCancellationPolicy(j.cancellation_policy ?? "");
    setAppointmentRequiredFieldsJson(j.appointment_required_fields_json ?? "");
    setDefaultDurationMin(j.default_appointment_duration_minutes ?? 30);
    setSlotStepMin(j.slot_step_minutes ?? 15);
    setMinLeadTimeMin(j.min_lead_time_minutes ?? 60);
    setMaxAdvanceDays(j.max_advance_days ?? 30);
    setBufferMin(j.buffer_between_appointments_minutes ?? 0);
    setRequiresIdDocument(Boolean(j.requires_id_document));
    setRequireAppointmentConfirmation(Boolean(j.require_appointment_confirmation ?? true));
    setAgentResponseLanguage((j.agent_response_language || "es").slice(0, 16));
    setAgentToneStyle((j.agent_tone_style || "professional").slice(0, 32));
    setReminderHoursBefore(j.reminder_hours_before ?? 24);
    setReminderMessageTemplate(j.reminder_message_template ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/internal/settings", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const j = (await res.json()) as Settings;
      applySettingsToState(j);
    } catch (e) {
      const text = e instanceof Error ? e.message : "No se pudo cargar la configuración";
      toast(text, "err");
      setMessage({
        type: "err",
        text,
      });
    } finally {
      setLoading(false);
    }
  }, [applySettingsToState, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCatalogFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCatalogImporting(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/internal/settings/agent-catalog/parse", {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      let parsed: {
        detail?: string | { msg?: string }[];
        catalog_fragment?: string;
        rows_imported?: number;
        file_type?: string;
      };
      try {
        parsed = JSON.parse(text) as typeof parsed;
      } catch {
        throw new Error(text.slice(0, 280) || "Error al importar");
      }
      if (!res.ok) {
        const d = parsed.detail;
        const msg =
          typeof d === "string"
            ? d
            : Array.isArray(d)
              ? JSON.stringify(d)
              : text.slice(0, 280);
        throw new Error(msg);
      }
      const fragment = (parsed.catalog_fragment ?? "").trim();
      const n = parsed.rows_imported ?? 0;
      const ft = parsed.file_type ?? "";
      const header = `# Import ${file.name} (${n} filas, ${ft})\n`;
      const mode = catalogImportMode;
      setAgentCatalog((prev) => {
        if (mode === "replace") {
          return `${header}${fragment}`.trim();
        }
        const p = prev.trim();
        if (!p) return `${header}${fragment}`.trim();
        return `${p}\n\n${header}${fragment}`.trim();
      });
      setMessage(null);
      toast(`Importadas ${n} filas (${ft}). Revisa el catálogo y pulsa «Guardar configuración».`, "info");
    } catch (err) {
      const text = err instanceof Error ? err.message : "No se pudo importar el archivo";
      toast(text.length > 140 ? `${text.slice(0, 140)}…` : text, "err");
      setMessage({
        type: "err",
        text,
      });
    } finally {
      setCatalogImporting(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const geminiModelToSave =
        geminiModelSelectValue(geminiModel) === GEMINI_MODEL_CUSTOM
          ? geminiModel.trim()
          : geminiModel;
      if (llmProvider === "gemini" && !geminiModelToSave) {
        throw new Error(
          "El modelo Gemini no puede estar vacío: elige una opción del listado o escribe un ID en «Otro».",
        );
      }
      const payload: Record<string, unknown> = {
        twilio_account_sid: twilioAccountSid,
        webhook_base_url: webhookBaseUrl,
        twilio_validate_signature: validateSignature,
        llm_provider: llmProvider,
        openai_model: openaiModel,
        gemini_model: geminiModelToSave,
        agent_business_summary: agentBusinessSummary,
        agent_instructions: agentInstructions,
        agent_lead_capture: agentLeadCapture,
        agent_catalog: agentCatalog,
        agent_pricing_rules: agentPricingRules,
        agent_shipping_zones: agentShippingZones,
        agent_payment_methods: agentPaymentMethods,
        agent_returns_warranty: agentReturnsWarranty,
        agent_faq: agentFaq,
        agent_off_hours_message: agentOffHoursMessage,
        agent_hard_rules: agentHardRules,
        google_calendar_id: googleCalendarId,
        // citas
        business_name: businessName,
        business_type: businessType,
        business_timezone: businessTimezone,
        business_address: businessAddress,
        business_phone_display: businessPhoneDisplay,
        welcome_message: welcomeMessage,
        welcome_menu_options_json: welcomeMenuOptionsJson,
        working_hours_json: workingHoursJson,
        closed_dates_json: closedDatesJson,
        services_json: servicesJson,
        cancellation_policy: cancellationPolicy,
        appointment_required_fields_json: appointmentRequiredFieldsJson,
        default_appointment_duration_minutes: defaultDurationMin,
        slot_step_minutes: slotStepMin,
        min_lead_time_minutes: minLeadTimeMin,
        max_advance_days: maxAdvanceDays,
        buffer_between_appointments_minutes: bufferMin,
        requires_id_document: requiresIdDocument,
        require_appointment_confirmation: requireAppointmentConfirmation,
        agent_response_language: agentResponseLanguage,
        agent_tone_style: agentToneStyle,
        reminder_hours_before: reminderHoursBefore,
        reminder_message_template: reminderMessageTemplate,
      };
      if (twilioToken.trim()) payload.twilio_auth_token = twilioToken.trim();
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim();
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim();
      if (googleServiceAccountJson.trim())
        payload.google_service_account_json = googleServiceAccountJson.trim();

      const res = await fetch("/api/internal/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const j = (await res.json()) as Settings;
      applySettingsToState(j);
      toast("Guardado correctamente.", "ok");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Error al guardar";
      toast(text.length > 160 ? `${text.slice(0, 160)}…` : text, "err");
      setMessage({
        type: "err",
        text,
      });
    } finally {
      setSaving(false);
    }
  }

  async function performClearSecrets() {
    setClearSecretsModalOpen(false);
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/internal/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twilio_auth_token: "",
          openai_api_key: "",
          gemini_api_key: "",
          google_service_account_json: "",
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      await load();
      toast("Credenciales del panel eliminadas. Si existen variables en la API, se usarán allí.", "ok");
    } catch (err) {
      const text = err instanceof Error ? err.message : "Error";
      toast(text.length > 160 ? `${text.slice(0, 160)}…` : text, "err");
      setMessage({
        type: "err",
        text,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <PanelPageHeader
          eyebrow="Consola"
          title="Ajustes"
          subtitle={
            <>
              Credenciales y comportamiento del bot. Lo que guardes aquí tiene prioridad sobre el{" "}
              <code className="rounded-md bg-[var(--wa-chip-bg)] px-1.5 py-0.5 text-[13px] text-[var(--wa-text)] ring-1 ring-[var(--wa-border)]">
                .env
              </code>{" "}
              de la API.
            </>
          }
        />

        <div className="mt-6">

        {loading ? (
          <div className="mt-8 space-y-3" aria-busy="true" aria-label="Cargando ajustes">
            <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--wa-panel)]" />
            <div className="h-32 animate-pulse rounded-2xl bg-[var(--wa-panel)]" />
            <div className="h-40 animate-pulse rounded-2xl bg-[var(--wa-panel)]" />
          </div>
        ) : (
          <form onSubmit={onSave} className="mt-6">
            <SettingsTabBar tab={settingsTab} onTabChange={setSettingsTab} />
            <SettingsSectionNav tab={settingsTab} />

            <p className="mt-3 text-center text-xs leading-relaxed text-[var(--wa-text-muted)] sm:text-left">
              <strong className="text-[var(--wa-text)]">Guardar</strong> aplica todo el formulario (general + agente).
              Puedes cambiar de pestaña para revisar antes de enviar.
            </p>

            <div className="mt-8 space-y-8">
              {settingsTab === "general" ? (
                <>
                  <TwilioWhatsappSection
                    twilioAccountSid={twilioAccountSid}
                    onTwilioAccountSid={setTwilioAccountSid}
                    twilioToken={twilioToken}
                    onTwilioToken={setTwilioToken}
                    data={data}
                  />
                  <WebhookUrlSection
                    webhookBaseUrl={webhookBaseUrl}
                    onWebhookBaseUrl={setWebhookBaseUrl}
                    validateSignature={validateSignature}
                    onValidateSignature={setValidateSignature}
                    data={data}
                  />
                  <GoogleCalendarSection
                    googleCalendarId={googleCalendarId}
                    onGoogleCalendarId={setGoogleCalendarId}
                    googleServiceAccountJson={googleServiceAccountJson}
                    onGoogleServiceAccountJson={setGoogleServiceAccountJson}
                    data={data}
                  />
                  <LlmMotorSection
                    llmProvider={llmProvider}
                    onLlmProvider={setLlmProvider}
                    openaiKey={openaiKey}
                    onOpenaiKey={setOpenaiKey}
                    openaiModel={openaiModel}
                    onOpenaiModel={setOpenaiModel}
                    geminiKey={geminiKey}
                    onGeminiKey={setGeminiKey}
                    geminiModel={geminiModel}
                    onGeminiModel={setGeminiModel}
                    data={data}
                  />
                  <section id="cfg-reminders" className="wa-glass rounded-2xl p-6 sm:p-7">
                    <h2 className="text-lg font-semibold text-[var(--wa-text)]">Canal y recordatorios</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--wa-text-muted)]">
                      Confirmación en dos pasos, idioma/tono homogéneos (incluidos mensajes de error al usuario) y
                      recordatorios automáticos por WhatsApp según la plantilla.
                    </p>
                    <div className="mt-6 space-y-4">
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--wa-text)]">
                        <input
                          type="checkbox"
                          checked={requireAppointmentConfirmation}
                          onChange={(e) => setRequireAppointmentConfirmation(e.target.checked)}
                          className="h-4 w-4 accent-[var(--wa-accent)]"
                        />
                        Exigir confirmación explícita del cliente (&quot;¿Confirmas el martes 10:00?&quot;) antes de
                        cerrar la cita
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-[var(--wa-text-muted)]">Idioma principal del agente</span>
                          <select
                            value={agentResponseLanguage}
                            onChange={(e) => setAgentResponseLanguage(e.target.value)}
                            className="wa-input rounded-lg px-3 py-2"
                          >
                            <option value="es">Español</option>
                            <option value="en">Inglés</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-[var(--wa-text-muted)]">Tono</span>
                          <select
                            value={agentToneStyle}
                            onChange={(e) => setAgentToneStyle(e.target.value)}
                            className="wa-input rounded-lg px-3 py-2"
                          >
                            <option value="professional">Profesional / ejecutivo</option>
                            <option value="formal">Formal</option>
                            <option value="warm">Cercano</option>
                          </select>
                        </label>
                      </div>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-[var(--wa-text-muted)]">Horas antes del inicio para el recordatorio</span>
                        <input
                          type="number"
                          min={0}
                          max={336}
                          value={reminderHoursBefore}
                          onChange={(e) => setReminderHoursBefore(Number(e.target.value))}
                          className="wa-input w-full max-w-xs rounded-lg px-3 py-2"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="text-[var(--wa-text-muted)]">
                          Plantilla de recordatorio (variables: {"{client_name}"}, {"{service_label}"},{" "}
                          {"{start_local}"}, {"{business_name}"})
                        </span>
                        <textarea
                          rows={3}
                          value={reminderMessageTemplate}
                          onChange={(e) => setReminderMessageTemplate(e.target.value)}
                          className="wa-input rounded-lg px-3 py-2"
                        />
                      </label>
                    </div>
                  </section>
                </>
              ) : (
                <AgentPersonalityPanel
                  catalogFileInputRef={catalogFileInputRef}
                  onCatalogFileChange={handleCatalogFileChange}
                  catalogImportMode={catalogImportMode}
                  onCatalogImportMode={setCatalogImportMode}
                  catalogImporting={catalogImporting}
                  businessName={businessName}
                  onBusinessName={setBusinessName}
                  businessType={businessType}
                  onBusinessType={setBusinessType}
                  businessTimezone={businessTimezone}
                  onBusinessTimezone={setBusinessTimezone}
                  businessAddress={businessAddress}
                  onBusinessAddress={setBusinessAddress}
                  businessPhoneDisplay={businessPhoneDisplay}
                  onBusinessPhoneDisplay={setBusinessPhoneDisplay}
                  businessTypeChoices={data?.business_type_choices ?? []}
                  agentBusinessSummary={agentBusinessSummary}
                  onAgentBusinessSummary={setAgentBusinessSummary}
                  workingHoursJson={workingHoursJson}
                  onWorkingHoursJson={setWorkingHoursJson}
                  closedDatesJson={closedDatesJson}
                  onClosedDatesJson={setClosedDatesJson}
                  servicesJson={servicesJson}
                  onServicesJson={setServicesJson}
                  agentCatalog={agentCatalog}
                  onAgentCatalog={setAgentCatalog}
                  defaultDurationMin={defaultDurationMin}
                  onDefaultDurationMin={setDefaultDurationMin}
                  slotStepMin={slotStepMin}
                  onSlotStepMin={setSlotStepMin}
                  minLeadTimeMin={minLeadTimeMin}
                  onMinLeadTimeMin={setMinLeadTimeMin}
                  maxAdvanceDays={maxAdvanceDays}
                  onMaxAdvanceDays={setMaxAdvanceDays}
                  bufferMin={bufferMin}
                  onBufferMin={setBufferMin}
                  requiresIdDocument={requiresIdDocument}
                  onRequiresIdDocument={setRequiresIdDocument}
                  welcomeMessage={welcomeMessage}
                  onWelcomeMessage={setWelcomeMessage}
                  welcomeMenuOptionsJson={welcomeMenuOptionsJson}
                  onWelcomeMenuOptionsJson={setWelcomeMenuOptionsJson}
                  cancellationPolicy={cancellationPolicy}
                  onCancellationPolicy={setCancellationPolicy}
                  appointmentRequiredFieldsJson={appointmentRequiredFieldsJson}
                  onAppointmentRequiredFieldsJson={setAppointmentRequiredFieldsJson}
                  agentLeadCapture={agentLeadCapture}
                  onAgentLeadCapture={setAgentLeadCapture}
                  agentPricingRules={agentPricingRules}
                  onAgentPricingRules={setAgentPricingRules}
                  agentPaymentMethods={agentPaymentMethods}
                  onAgentPaymentMethods={setAgentPaymentMethods}
                  agentShippingZones={agentShippingZones}
                  onAgentShippingZones={setAgentShippingZones}
                  agentFaq={agentFaq}
                  onAgentFaq={setAgentFaq}
                  agentOffHoursMessage={agentOffHoursMessage}
                  onAgentOffHoursMessage={setAgentOffHoursMessage}
                  agentHardRules={agentHardRules}
                  onAgentHardRules={setAgentHardRules}
                  agentInstructions={agentInstructions}
                  onAgentInstructions={setAgentInstructions}
                />
              )}

              <ConfiguracionFormActions
                settingsTab={settingsTab}
                saving={saving}
                onReload={() => void load()}
                onRequestClearSecrets={() => setClearSecretsModalOpen(true)}
              />
            </div>
          </form>
        )}
        </div>
      </div>

      <ConfiguracionResultModal message={message} onClose={() => setMessage(null)} />
      <ConfiguracionClearSecretsModal
        open={clearSecretsModalOpen}
        saving={saving}
        onCancel={() => setClearSecretsModalOpen(false)}
        onConfirm={() => void performClearSecrets()}
      />
    </div>
  );
}
