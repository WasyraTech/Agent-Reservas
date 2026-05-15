"""Ejecuta scripts/sql/pin_eddy_developer_workspace_twilio.sql contra DATABASE_URL (p. ej. desde Docker api)."""

from __future__ import annotations

import os
import pathlib
import sys
import urllib.parse

import psycopg


def clean_database_url(raw: str) -> str:
    u = urllib.parse.urlsplit(raw)
    q = urllib.parse.parse_qs(u.query, keep_blank_values=True)
    q.pop("pgbouncer", None)
    new_query = urllib.parse.urlencode(q, doseq=True)
    base = urllib.parse.urlunsplit((u.scheme, u.netloc, u.path, new_query, u.fragment))
    if "sslmode=" not in base:
        base += ("&" if "?" in base else "?") + "sslmode=require"
    return base


def main() -> int:
    root = pathlib.Path(__file__).resolve().parents[1]
    sql_path = root / "scripts" / "sql" / "pin_eddy_developer_workspace_twilio.sql"
    if not sql_path.is_file():
        print("Missing", sql_path, file=sys.stderr)
        return 2
    sql = sql_path.read_text(encoding="utf-8")
    url = clean_database_url(os.environ["DATABASE_URL"])
    try:
        with psycopg.connect(url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
        with psycopg.connect(url, autocommit=True) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, twilio_whatsapp_to FROM workspaces ORDER BY name")
                print("workspaces:", cur.fetchall())
                cur.execute(
                    "SELECT workspace_id, business_name, business_type, "
                    "left(coalesce(welcome_message, ''), 90) FROM app_configuration"
                )
                print("app_configuration:", cur.fetchall())
    except Exception as e:
        print(type(e).__name__, e, file=sys.stderr)
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
