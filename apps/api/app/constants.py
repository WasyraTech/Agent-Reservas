"""Constantes de producto compartidas (sin lectura de env)."""

from __future__ import annotations

import uuid

# Workspace por defecto tras migración multi-tenant (una sola org hasta que crees más filas).
DEFAULT_WORKSPACE_ID: uuid.UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")

# Cola Redis para respuestas async al webhook Twilio.
REPLY_JOB_QUEUE_KEY = "webhook:reply_jobs"
