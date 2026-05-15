-- -----------------------------------------------------------------------------
-- Pin Twilio → workspace "EDDY DEVELOPER" (barbería Casita) y evitar el Default
--
-- Problema: `resolve_workspace_id_for_twilio_to` usa el workspace Default
-- (000…0001) cuando hay 0 coincidencias por número O cuando hay **más de un**
-- workspace con `twilio_whatsapp_to` NULL (no puede elegir comodín).
--
-- Qué hace este script:
-- 1) Localiza el workspace cuyo nombre contiene EDDY y DEVELOPER.
-- 2) Asigna a **todos los demás** workspaces un `twilio_whatsapp_to` interno
--    único (nunca coincide con un `To` real de Twilio).
-- 3) Deja **solo** ese workspace con `twilio_whatsapp_to` NULL → comodín único.
-- 4) Actualiza `app_configuration` de ese workspace con mensaje/menú de barbería.
-- 5) Neutraliza el workspace Default para que, si algo cae ahí, no hable de clínica.
--
-- Ejecutar una vez en Supabase → SQL Editor (o `psql` contra tu BD).
-- -----------------------------------------------------------------------------

BEGIN;

DO $$
DECLARE
  eddy_id uuid;
BEGIN
  SELECT id INTO eddy_id
  FROM workspaces
  WHERE name ILIKE '%EDDY%DEVELOPER%'
  ORDER BY created_at ASC
  LIMIT 1;

  IF eddy_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró workspace con nombre que contenga EDDY y DEVELOPER. Crea o renombra el workspace y vuelve a ejecutar.';
  END IF;

  -- Todos los que NO son EDDY: número interno único (no colisiona con whatsapp:+…)
  UPDATE workspaces w
  SET twilio_whatsapp_to = 'internal:' || replace(w.id::text, '-', '')
  WHERE w.id <> eddy_id;

  -- EDDY: único comodín NULL (un solo NULL → el código lo elige para Twilio)
  UPDATE workspaces
  SET twilio_whatsapp_to = NULL
  WHERE id = eddy_id;
END $$;

-- Barbería Casita en el workspace EDDY (solo filas existentes de app_configuration)
UPDATE app_configuration ac
SET
  business_name = 'Casita',
  business_type = 'barbershop',
  welcome_message =
    'Hola, gracias por escribir a Casita 👋 Somos una barbería en Lima, Perú. ¿En qué te puedo ayudar hoy?',
  welcome_menu_options_json =
    $$[
  {"label": "Servicios, tiempos y precios"},
  {"label": "Horarios, ubicación y pagos"}
]$$,
  agent_business_summary =
    'Casita es una barbería: cortes, degradés, barba y cejas. Trabajamos con cita previa para ordenar la agenda.'
WHERE ac.workspace_id IN (
  SELECT id FROM workspaces WHERE name ILIKE '%EDDY%DEVELOPER%' LIMIT 1
);

-- Default: ya no debería recibir WhatsApp; si algo cae aquí, mensaje neutro
UPDATE app_configuration
SET
  welcome_message =
    'Hola. Este canal no está configurado para este número. Contacta al administrador para enlazar WhatsApp al workspace correcto.',
  welcome_menu_options_json = '[]',
  business_type = 'other',
  agent_business_summary =
    'Workspace técnico por defecto. El tráfico de WhatsApp debe resolverse contra el workspace del negocio (EDDY DEVELOPER / Casita).'
WHERE workspace_id = '00000000-0000-0000-0000-000000000001'::uuid;

COMMIT;

-- Comprobar resultado:
-- SELECT id, name, twilio_whatsapp_to FROM workspaces ORDER BY name;
-- SELECT workspace_id, business_name, business_type, left(welcome_message, 80) FROM app_configuration;
