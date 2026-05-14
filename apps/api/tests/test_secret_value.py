from __future__ import annotations

import pytest

from app.services.secret_value import resolve_config_secret


def test_resolve_plain_returns_same() -> None:
    assert resolve_config_secret("sk-test") == "sk-test"


def test_resolve_env_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MY_SECRET_TOKEN", "abc123")
    assert resolve_config_secret("env:MY_SECRET_TOKEN") == "abc123"


def test_resolve_env_missing_is_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NOT_SET_XYZ", raising=False)
    assert resolve_config_secret("env:NOT_SET_XYZ") == ""
