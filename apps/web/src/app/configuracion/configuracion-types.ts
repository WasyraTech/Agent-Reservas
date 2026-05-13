export type LlmProvider = "openai" | "gemini";

export type Settings = {
  twilio_account_sid: string;
  webhook_base_url: string;
  twilio_validate_signature: boolean;
  llm_provider: LlmProvider;
  openai_model: string;
  gemini_model: string;
  twilio_auth_token_configured: boolean;
  openai_api_key_configured: boolean;
  gemini_api_key_configured: boolean;
  twilio_webhook_full_url: string;

  // --- legacy "campos libres" (siguen funcionando como fallback de prompt) ---
  agent_business_summary: string;
  agent_instructions: string;
  agent_lead_capture: string;
  agent_catalog: string;
  agent_pricing_rules: string;
  agent_shipping_zones: string;
  agent_payment_methods: string;
  agent_returns_warranty: string;
  agent_faq: string;
  agent_off_hours_message: string;
  agent_hard_rules: string;

  google_calendar_id: string;
  google_service_account_json_configured: boolean;

  // --- citas: identidad ---
  business_name: string;
  business_type: string;
  business_timezone: string;
  business_address: string;
  business_phone_display: string;

  // --- citas: menú + horarios + servicios (JSON crudo guardado como texto) ---
  welcome_message: string;
  welcome_menu_options_json: string;
  working_hours_json: string;
  closed_dates_json: string;
  services_json: string;
  cancellation_policy: string;
  appointment_required_fields_json: string;
  reminder_message_template: string;

  // --- citas: reglas ---
  default_appointment_duration_minutes: number;
  slot_step_minutes: number;
  min_lead_time_minutes: number;
  max_advance_days: number;
  buffer_between_appointments_minutes: number;
  reminder_hours_before: number;
  requires_id_document: boolean;

  // --- selects ---
  business_type_choices?: string[];
};

export type SettingsTab = "general" | "agent";

export const BUSINESS_TYPE_LABELS_ES: Record<string, string> = {
  dental: "Consultorio odontológico",
  clinic: "Clínica de salud",
  medical: "Consulta médica",
  salon: "Salón de belleza",
  spa: "Spa / centro de bienestar",
  barbershop: "Barbería",
  vet: "Clínica veterinaria",
  legal: "Estudio legal",
  consulting: "Consultoría",
  other: "Otro (cita previa)",
};

export const COMMON_TIMEZONES: string[] = [
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/Caracas",
  "America/Guayaquil",
  "America/Asuncion",
  "America/La_Paz",
  "America/Montevideo",
  "America/Panama",
  "Europe/Madrid",
];
