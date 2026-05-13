-- Citas + Google Calendar (alineado con Alembic 002_appointments_google)
CREATE TABLE IF NOT EXISTS appointments (
	id UUID NOT NULL PRIMARY KEY,
	conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
	status VARCHAR(16) NOT NULL DEFAULT 'confirmed',
	start_at TIMESTAMPTZ NOT NULL,
	end_at TIMESTAMPTZ NOT NULL,
	time_zone VARCHAR(64) NOT NULL DEFAULT 'America/Lima',
	client_name VARCHAR(255),
	client_email VARCHAR(255),
	service_label VARCHAR(255),
	google_event_id VARCHAR(255),
	notes TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_appointments_conversation_start ON appointments (conversation_id, start_at);
CREATE INDEX IF NOT EXISTS ix_appointments_start ON appointments (start_at);
CREATE INDEX IF NOT EXISTS ix_appointments_status ON appointments (status);

ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS google_calendar_id VARCHAR(512);
ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS google_service_account_json TEXT;

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
