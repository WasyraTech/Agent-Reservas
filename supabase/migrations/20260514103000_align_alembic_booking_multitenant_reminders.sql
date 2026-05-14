-- Alinea Supabase con Alembic 003 (booking), 004 (multi-tenant + solapes) y 005 (pendiente, recordatorios, tono).
-- Idempotente: seguro en bases ya migradas solo por Alembic o solo por migraciones SQL anteriores.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- 003: columnas de negocio / citas en app_configuration
-- ---------------------------------------------------------------------------
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS welcome_menu_options_json TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS working_hours_json TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS closed_dates_json TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS services_json TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS appointment_required_fields_json TEXT;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS reminder_message_template TEXT;

ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS business_type VARCHAR(32);
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS business_timezone VARCHAR(64);
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS business_phone_display VARCHAR(64);

ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS default_appointment_duration_minutes INTEGER;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS slot_step_minutes INTEGER;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS min_lead_time_minutes INTEGER;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS max_advance_days INTEGER;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS buffer_between_appointments_minutes INTEGER;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS reminder_hours_before INTEGER;

ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS requires_id_document BOOLEAN;

-- ---------------------------------------------------------------------------
-- 004: workspaces, API keys, workspace_id en conversations y app_configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL DEFAULT 'Default',
  twilio_whatsapp_to VARCHAR(96),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_workspaces_twilio_whatsapp_to ON workspaces (twilio_whatsapp_to);

INSERT INTO workspaces (id, name, twilio_whatsapp_to)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Default', NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS workspace_api_keys (
  id UUID NOT NULL PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
  key_hmac VARCHAR(128) NOT NULL,
  label VARCHAR(64) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_workspace_api_keys_workspace_id ON workspace_api_keys (workspace_id);
CREATE INDEX IF NOT EXISTS ix_workspace_api_keys_key_hmac ON workspace_api_keys (key_hmac);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces (id) ON DELETE RESTRICT;

UPDATE conversations
SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE workspace_id IS NULL;

ALTER TABLE conversations ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_conversations_workspace_id ON conversations (workspace_id);

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS uq_conversations_from_to;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS uq_conversations_workspace_from_to;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_conversations_workspace_from_to'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT uq_conversations_workspace_from_to
      UNIQUE (workspace_id, twilio_from, twilio_to);
  END IF;
END $$;

ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces (id) ON DELETE CASCADE;

UPDATE app_configuration
SET workspace_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE workspace_id IS NULL;

ALTER TABLE app_configuration ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_app_configuration_workspace_id ON app_configuration (workspace_id);

ALTER TABLE app_configuration DROP CONSTRAINT IF EXISTS uq_app_configuration_workspace_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_app_configuration_workspace_id'
  ) THEN
    ALTER TABLE app_configuration ADD CONSTRAINT uq_app_configuration_workspace_id
      UNIQUE (workspace_id);
  END IF;
END $$;

-- Exclusión de solapes: estado final Alembic 005 (confirmed + pending_confirmation)
DO $$
BEGIN
  IF to_regclass('public.appointments') IS NULL THEN
    RETURN;
  END IF;
  ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap_confirmed;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap_reserved'
  ) THEN
    ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap_reserved
      EXCLUDE USING gist (
        tstzrange(start_at, end_at, '[)') WITH &&
      ) WHERE (status::text IN ('confirmed', 'pending_confirmation'));
  END IF;
END $$;

ALTER TABLE workspace_api_keys ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS require_appointment_confirmation BOOLEAN DEFAULT true;
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS agent_response_language VARCHAR(16) DEFAULT 'es';
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS agent_tone_style VARCHAR(32) DEFAULT 'professional';

UPDATE app_configuration SET require_appointment_confirmation = true WHERE require_appointment_confirmation IS NULL;
UPDATE app_configuration SET agent_response_language = 'es' WHERE agent_response_language IS NULL;
UPDATE app_configuration SET agent_tone_style = 'professional' WHERE agent_tone_style IS NULL;

-- RLS (defensa en profundidad frente a Data API; el backend con rol postgres suele ignorar RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_api_keys ENABLE ROW LEVEL SECURITY;
