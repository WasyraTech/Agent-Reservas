export function ConfiguracionFormActions({
  settingsTab,
  saving,
  onReload,
  onRequestClearSecrets,
}: {
  settingsTab: "general" | "agent";
  saving: boolean;
  onReload: () => void;
  /** Abre el modal de confirmación (no borra aún). */
  onRequestClearSecrets: () => void;
}) {
  return (
    <>
      {settingsTab === "general" ? (
        <section className="rounded-lg border border-[#fde68a] bg-[#fffbeb] p-4 text-sm text-[#92400e]">
          <strong>Importante:</strong> guardar secretos en la base de datos (Supabase) es cómodo para desarrollo; en
          producción valora cifrar, usar un vault o solo variables de entorno.
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#25D366] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a] disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onReload}
          className="rounded-lg border border-[var(--wa-border)] bg-[var(--wa-panel)] px-5 py-2.5 text-sm font-medium text-[var(--wa-text)] shadow-sm transition hover:bg-[var(--wa-panel-hover)] disabled:opacity-50"
        >
          Recargar
        </button>
        {settingsTab === "general" ? (
          <button
            type="button"
            disabled={saving}
            onClick={onRequestClearSecrets}
            className="rounded-lg border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-800 transition hover:bg-red-100 disabled:opacity-50"
          >
            Borrar tokens del panel
          </button>
        ) : null}
      </div>
    </>
  );
}
