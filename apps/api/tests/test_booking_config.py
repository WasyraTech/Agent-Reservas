"""Tests para los parsers/dataclasses de configuración de citas."""

from __future__ import annotations

from app.services.booking_config import (
    parse_services,
    parse_welcome_menu,
    parse_working_hours,
)


def test_parse_working_hours_minimal() -> None:
    raw = '{"mon":[{"start":"09:00","end":"13:00"},{"start":"15:00","end":"19:00"}]}'
    wh = parse_working_hours(raw)
    mon = next(d for d in wh.days if d.weekday == "mon")
    assert not mon.is_closed()
    assert mon.intervals[0].start == "09:00"
    assert mon.intervals[1].end == "19:00"
    sun = next(d for d in wh.days if d.weekday == "sun")
    assert sun.is_closed()


def test_parse_working_hours_invalid_json_returns_empty() -> None:
    wh = parse_working_hours("nope")
    assert all(d.is_closed() for d in wh.days)
    assert wh.closed_dates == ()


def test_parse_working_hours_invalid_interval_skipped() -> None:
    raw = '{"tue":[{"start":"25:00","end":"23:00"},{"start":"10:00","end":"12:00"}]}'
    wh = parse_working_hours(raw)
    tue = next(d for d in wh.days if d.weekday == "tue")
    assert len(tue.intervals) == 1
    assert tue.intervals[0].start == "10:00"


def test_parse_working_hours_closed_dates_filters_format() -> None:
    wh = parse_working_hours("{}", '["2026-12-25","invalid","2027-01-01"]')
    assert wh.closed_dates == ("2026-12-25", "2027-01-01")


def test_human_lines_render_human_friendly() -> None:
    raw = (
        '{"mon":[{"start":"09:00","end":"13:00"},{"start":"15:00","end":"19:00"}],'
        '"sat":[{"start":"10:00","end":"14:00"}]}'
    )
    wh = parse_working_hours(raw, '["2026-12-25"]')
    text = "\n".join(wh.to_human_lines())
    assert "Lunes: 09:00–13:00, 15:00–19:00" in text
    assert "Sábado: 10:00–14:00" in text
    assert "Domingo: cerrado" in text
    assert "2026-12-25" in text


def test_parse_services_basic() -> None:
    raw = (
        '[{"name":"Limpieza dental","duration_minutes":30,"price":"S/ 80"},'
        '{"name":"Endodoncia","duration_minutes":90,"requires_deposit":true,'
        '"prep_instructions":"Llegar 10 min antes"}]'
    )
    svcs = parse_services(raw)
    assert len(svcs) == 2
    assert svcs[0].duration_minutes == 30
    assert "S/ 80" in svcs[0].to_human_line()
    assert svcs[1].requires_deposit is True
    assert "Preparación" in svcs[1].to_human_line()


def test_parse_services_dur_clamp() -> None:
    """Duraciones absurdas se acotan a un rango sensato."""
    raw = '[{"name":"Maratón","duration_minutes":100000}]'
    svcs = parse_services(raw)
    assert svcs[0].duration_minutes <= 8 * 60
    raw2 = '[{"name":"Micro","duration_minutes":1}]'
    svcs2 = parse_services(raw2)
    assert svcs2[0].duration_minutes >= 5


def test_parse_services_skips_unnamed() -> None:
    raw = '[{"duration_minutes":30},{"name":"","price":"x"},{"name":"Real"}]'
    svcs = parse_services(raw)
    assert len(svcs) == 1
    assert svcs[0].name == "Real"


def test_parse_welcome_menu_with_descriptions() -> None:
    raw = (
        '[{"label":"Información sobre tratamientos"},'
        '{"label":"Horarios y dirección","description":"Hablar de schedule"}]'
    )
    menu = parse_welcome_menu(raw)
    assert len(menu.options) == 2
    assert menu.options[0].label == "Información sobre tratamientos"
    lines = menu.render_lines()
    assert len(lines) == 3  # 2 + book
    assert lines[-1].endswith("Agendar una cita")


def test_parse_welcome_menu_strings_allowed() -> None:
    menu = parse_welcome_menu('["Opción A","Opción B"]')
    labels = [o.label for o in menu.options]
    assert labels == ["Opción A", "Opción B"]


def test_parse_welcome_menu_empty_returns_book_only() -> None:
    menu = parse_welcome_menu("")
    assert menu.options == ()
    assert menu.render_lines() == ["1. Agendar una cita"]
