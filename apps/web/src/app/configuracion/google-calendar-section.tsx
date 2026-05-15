import { inputClass, textareaClass, SECRET_PANEL_FIELD_NOTE } from "./configuracion-constants";
import type { Settings } from "./configuracion-types";

export function GoogleCalendarSection({
  googleCalendarId,
  onGoogleCalendarId,
  googleServiceAccountJson,
  onGoogleServiceAccountJson,
  data,
}: {
  googleCalendarId: string;
  onGoogleCalendarId: (v: string) => void;
  googleServiceAccountJson: string;
  onGoogleServiceAccountJson: (v: string) => void;
  data: Settings | null;
}) {
  return (
    <section id="cfg-calendar" className="rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-panel)] p-6 shadow-xl sm:p-7">
      <h2 className="text-lg font-semibold text-[var(--wa-text)]">Google Calendar (agenda)</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--wa-text-muted)]">
        Cuenta de servicio con API Calendar habilitada; comparte el calendario con el correo{" "}
        <code className="rounded bg-black/35 px-1">client_email</code> del JSON (rol editor). El
        agente usa <strong>freebusy</strong> y crea eventos al confirmar citas.
      </p>
      {data?.google_service_account_json_configured ? (
        <p className="mt-2 text-xs font-medium text-[var(--wa-accent-soft)]">
          Hay JSON de cuenta de servicio guardado. Pega uno nuevo para reemplazarlo, o borra el
          contenido del área y guarda para quitarlo del panel.
        </p>
      ) : null}
      <div className="mt-4">
        <label className="block text-sm font-medium text-[var(--wa-text-muted)]">
          ID del calendario
        </label>
        <input
          className={inputClass}
          value={googleCalendarId}
          onChange={(e) => onGoogleCalendarId(e.target.value)}
          placeholder="ej. negocio@group.calendar.google.com o primary"
        />
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-[var(--wa-text-muted)]">
          JSON de cuenta de servicio (secreto)
        </label>
        <textarea
          className={textareaClass}
          rows={6}
          value={googleServiceAccountJson}
          onChange={(e) => onGoogleServiceAccountJson(e.target.value)}
          placeholder='{"type": "service_account", "project_id": "...", ...}'
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-[var(--wa-text-muted)]">{SECRET_PANEL_FIELD_NOTE}</p>
      </div>
    </section>
  );
}
