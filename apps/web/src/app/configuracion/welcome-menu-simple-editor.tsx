"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type WelcomeMenuSimple,
  parseWelcomeMenuSimple,
  serializeWelcomeMenuSimple,
} from "./booking-form-utils";

import { inputClass, textareaClass } from "./configuracion-constants";

export function WelcomeMenuSimpleEditor({
  welcomeMessage,
  onWelcomeMessage,
  welcomeMenuOptionsJson,
  onWelcomeMenuOptionsJson,
}: {
  welcomeMessage: string;
  onWelcomeMessage: (v: string) => void;
  welcomeMenuOptionsJson: string;
  onWelcomeMenuOptionsJson: (v: string) => void;
}) {
  const [menu, setMenu] = useState<WelcomeMenuSimple>(() => parseWelcomeMenuSimple(welcomeMenuOptionsJson));

  useEffect(() => {
    setMenu(parseWelcomeMenuSimple(welcomeMenuOptionsJson));
  }, [welcomeMenuOptionsJson]);

  const syncMenu = useCallback(
    (next: WelcomeMenuSimple) => {
      setMenu(next);
      onWelcomeMenuOptionsJson(serializeWelcomeMenuSimple(next));
    },
    [onWelcomeMenuOptionsJson],
  );

  return (
    <div className="space-y-5">
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--wa-text-muted)]">Mensaje de bienvenida</span>
        <textarea
          className={textareaClass}
          value={welcomeMessage}
          onChange={(e) => onWelcomeMessage(e.target.value)}
          placeholder="Hola, gracias por escribirnos. Soy el asistente virtual…"
          rows={3}
          spellCheck
        />
      </label>

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-violet-500/10 via-transparent to-sky-500/10 p-4 sm:p-5">
        <p className="text-xs font-semibold text-[var(--wa-text)]">Dos botones de información</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--wa-text-muted)]">
          El bot mostrará estas dos opciones numeradas y luego una tercera fija: agendar cita.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300/90">Opción 1</span>
            <input
              className={`${inputClass} mt-2`}
              value={menu.opt1Label}
              onChange={(e) => syncMenu({ ...menu, opt1Label: e.target.value })}
              placeholder="Ej. Información sobre tratamientos"
            />
            <textarea
              className={`${textareaClass} mt-2 min-h-[64px] text-xs`}
              rows={2}
              value={menu.opt1Hint}
              onChange={(e) => syncMenu({ ...menu, opt1Hint: e.target.value })}
              placeholder="Nota interna para el bot (opcional)"
            />
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300/90">Opción 2</span>
            <input
              className={`${inputClass} mt-2`}
              value={menu.opt2Label}
              onChange={(e) => syncMenu({ ...menu, opt2Label: e.target.value })}
              placeholder="Ej. Horarios y ubicación"
            />
            <textarea
              className={`${textareaClass} mt-2 min-h-[64px] text-xs`}
              rows={2}
              value={menu.opt2Hint}
              onChange={(e) => syncMenu({ ...menu, opt2Hint: e.target.value })}
              placeholder="Nota interna para el bot (opcional)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
