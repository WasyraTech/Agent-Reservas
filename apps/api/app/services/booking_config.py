"""Modelos pequeños y parsers para la configuración del agente de citas.

Pensados para usarse desde:
    - `EffectiveSettings.parse_*()` (carga lo guardado en la BD como JSON).
    - `build_system_prompt(eff)` (genera secciones legibles para el LLM).
    - El panel `/configuracion` (lectura/escritura del JSON tal cual).

Decisiones de diseño:
    - El panel guarda **strings JSON** (no JSONB) por simplicidad y compatibilidad con `TEXT`.
    - Los parsers son **tolerantes**: si el JSON es inválido o falta un campo, devuelven defaults
      en vez de petar. El operador puede equivocarse y el bot debe seguir funcionando.
    - Tipos de negocio (`business_type`) son sólo una etiqueta para que el prompt module el tono;
      la lógica de citas es la misma para todos.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

DEFAULT_TIMEZONE = "America/Lima"
DEFAULT_DURATION_MINUTES = 30
DEFAULT_SLOT_STEP_MINUTES = 15
DEFAULT_MIN_LEAD_TIME_MINUTES = 60
DEFAULT_MAX_ADVANCE_DAYS = 30

BUSINESS_TYPES: tuple[str, ...] = (
    "dental",
    "clinic",
    "medical",
    "salon",
    "spa",
    "barbershop",
    "vet",
    "legal",
    "consulting",
    "other",
)

# Etiquetas legibles (para el system prompt). Sólo afecta el tono inicial.
BUSINESS_TYPE_LABELS: dict[str, str] = {
    "dental": "consultorio odontológico",
    "clinic": "clínica de salud",
    "medical": "consulta médica",
    "salon": "salón de belleza",
    "spa": "spa / centro de bienestar",
    "barbershop": "barbería",
    "vet": "clínica veterinaria",
    "legal": "estudio legal",
    "consulting": "consultoría",
    "other": "negocio de servicios con cita previa",
}

_WEEKDAYS: tuple[str, ...] = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
_WEEKDAY_LABELS_ES: dict[str, str] = {
    "mon": "Lunes",
    "tue": "Martes",
    "wed": "Miércoles",
    "thu": "Jueves",
    "fri": "Viernes",
    "sat": "Sábado",
    "sun": "Domingo",
}


@dataclass(frozen=True)
class TimeInterval:
    start: str  # "HH:MM" 24h
    end: str  # "HH:MM" 24h

    def is_valid(self) -> bool:
        try:
            sh, sm = map(int, self.start.split(":"))
            eh, em = map(int, self.end.split(":"))
        except Exception:
            return False
        if not (0 <= sh < 24 and 0 <= eh <= 24 and 0 <= sm < 60 and 0 <= em < 60):
            return False
        return (sh * 60 + sm) < (eh * 60 + em)


@dataclass(frozen=True)
class DaySchedule:
    weekday: str  # "mon".."sun"
    intervals: tuple[TimeInterval, ...]  # vacío = cerrado

    def is_closed(self) -> bool:
        return not self.intervals


@dataclass(frozen=True)
class WorkingHours:
    days: tuple[DaySchedule, ...]
    closed_dates: tuple[str, ...] = ()  # YYYY-MM-DD

    @classmethod
    def empty(cls) -> WorkingHours:
        return cls(days=tuple(DaySchedule(weekday=d, intervals=()) for d in _WEEKDAYS))

    def to_human_lines(self) -> list[str]:
        """Texto legible que se pega al system prompt (multilínea)."""
        lines: list[str] = []
        for d in self.days:
            label = _WEEKDAY_LABELS_ES.get(d.weekday, d.weekday)
            if d.is_closed():
                lines.append(f"- {label}: cerrado")
            else:
                rng = ", ".join(f"{iv.start}–{iv.end}" for iv in d.intervals)
                lines.append(f"- {label}: {rng}")
        if self.closed_dates:
            lines.append("- Fechas cerradas (feriados/vacaciones): " + ", ".join(self.closed_dates))
        return lines


@dataclass(frozen=True)
class Service:
    name: str
    duration_minutes: int = DEFAULT_DURATION_MINUTES
    price: str = ""
    description: str = ""
    requires_deposit: bool = False
    prep_instructions: str = ""

    def to_human_line(self) -> str:
        parts: list[str] = [self.name.strip() or "(sin nombre)"]
        if self.duration_minutes:
            parts.append(f"{self.duration_minutes} min")
        if self.price.strip():
            parts.append(self.price.strip())
        if self.requires_deposit:
            parts.append("requiere depósito")
        line = " · ".join(parts)
        extras: list[str] = []
        if self.description.strip():
            extras.append(self.description.strip())
        if self.prep_instructions.strip():
            extras.append(f"Preparación: {self.prep_instructions.strip()}")
        if extras:
            line += " — " + " | ".join(extras)
        return f"- {line}"


@dataclass(frozen=True)
class MenuOption:
    label: str  # "Información sobre tratamientos"
    description: str = ""  # detalle interno para el LLM (no se manda al usuario tal cual)


@dataclass(frozen=True)
class WelcomeMenu:
    """Menú inicial que el bot ofrece al cliente cuando es la primera interacción.

    Siempre se añade una opción extra fija de "Agendar cita" (`always_includes_book=True`)
    aunque el operador haya configurado <2 opciones.
    """

    options: tuple[MenuOption, ...] = ()
    always_includes_book: bool = True
    book_label: str = "Agendar una cita"

    def render_lines(self) -> list[str]:
        lines: list[str] = []
        for idx, opt in enumerate(self.options, start=1):
            lines.append(f"{idx}. {opt.label}")
        if self.always_includes_book:
            lines.append(f"{len(self.options) + 1}. {self.book_label}")
        return lines


# ---------------------------------------------------------------------------
# Parsers (tolerantes a errores)
# ---------------------------------------------------------------------------


def _safe_loads(raw: str) -> Any | None:
    if not raw or not raw.strip():
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def parse_working_hours(raw_hours: str, raw_closed_dates: str = "") -> WorkingHours:
    """Acepta JSON con forma:
    {"mon":[{"start":"09:00","end":"13:00"},{"start":"15:00","end":"19:00"}], ...}

    Días faltantes → cerrados. Intervalos inválidos → descartados.
    """
    data = _safe_loads(raw_hours)
    days: list[DaySchedule] = []
    if isinstance(data, dict):
        for wd in _WEEKDAYS:
            entries = data.get(wd) or []
            ivs: list[TimeInterval] = []
            if isinstance(entries, list):
                for e in entries:
                    if not isinstance(e, dict):
                        continue
                    iv = TimeInterval(
                        start=str(e.get("start", "")).strip(),
                        end=str(e.get("end", "")).strip(),
                    )
                    if iv.is_valid():
                        ivs.append(iv)
            days.append(DaySchedule(weekday=wd, intervals=tuple(ivs)))
    else:
        days = [DaySchedule(weekday=d, intervals=()) for d in _WEEKDAYS]

    closed_dates: list[str] = []
    closed_data = _safe_loads(raw_closed_dates)
    if isinstance(closed_data, list):
        for item in closed_data:
            s = str(item).strip()
            # Esperamos YYYY-MM-DD; validación laxa, sólo formato básico.
            if len(s) == 10 and s[4] == "-" and s[7] == "-":
                closed_dates.append(s)

    return WorkingHours(days=tuple(days), closed_dates=tuple(closed_dates))


def parse_services(raw: str) -> tuple[Service, ...]:
    """Acepta JSON: [{"name":"Limpieza","duration_minutes":30,"price":"S/ 80",...}, ...]

    Items sin `name` no se devuelven.
    """
    data = _safe_loads(raw)
    if not isinstance(data, list):
        return ()
    out: list[Service] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        try:
            dur = int(item.get("duration_minutes") or DEFAULT_DURATION_MINUTES)
        except Exception:
            dur = DEFAULT_DURATION_MINUTES
        out.append(
            Service(
                name=name,
                duration_minutes=max(5, min(dur, 8 * 60)),  # entre 5min y 8h
                price=str(item.get("price") or "").strip(),
                description=str(item.get("description") or "").strip(),
                requires_deposit=bool(item.get("requires_deposit") or False),
                prep_instructions=str(item.get("prep_instructions") or "").strip(),
            )
        )
    return tuple(out)


def parse_welcome_menu(raw: str, book_label: str = "Agendar una cita") -> WelcomeMenu:
    """Acepta JSON: [{"label":"...","description":"..."}, ...]

    Si está vacío o roto, devuelve un menú vacío con sólo la opción de agendar.
    """
    data = _safe_loads(raw)
    items: list[MenuOption] = []
    if isinstance(data, list):
        for it in data:
            if isinstance(it, dict):
                label = str(it.get("label") or "").strip()
                if not label:
                    continue
                items.append(MenuOption(label=label, description=str(it.get("description") or "")))
            elif isinstance(it, str) and it.strip():
                items.append(MenuOption(label=it.strip()))
    return WelcomeMenu(
        options=tuple(items[:5]),  # cap defensivo
        always_includes_book=True,
        book_label=book_label.strip() or "Agendar una cita",
    )


@dataclass(frozen=True)
class BookingPolicy:
    duration_minutes: int = DEFAULT_DURATION_MINUTES
    slot_step_minutes: int = DEFAULT_SLOT_STEP_MINUTES
    min_lead_time_minutes: int = DEFAULT_MIN_LEAD_TIME_MINUTES
    max_advance_days: int = DEFAULT_MAX_ADVANCE_DAYS
    buffer_between_appointments_minutes: int = 0
    requires_id_document: bool = False
    timezone: str = DEFAULT_TIMEZONE

    def to_human_lines(self) -> list[str]:
        lines = [
            f"- Duración estándar de cita: {self.duration_minutes} minutos",
            f"- Granularidad de huecos: cada {self.slot_step_minutes} minutos",
            f"- Antelación mínima: {self.min_lead_time_minutes} minutos",
            f"- Reserva con hasta {self.max_advance_days} días de adelanto",
            f"- Zona horaria: {self.timezone}",
        ]
        if self.buffer_between_appointments_minutes:
            lines.append(
                f"- Margen entre citas: {self.buffer_between_appointments_minutes} minutos"
            )
        if self.requires_id_document:
            lines.append("- Se solicita documento de identidad al confirmar")
        return lines
