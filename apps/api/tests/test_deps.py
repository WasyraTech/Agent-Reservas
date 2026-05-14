from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.constants import DEFAULT_WORKSPACE_ID
from app.deps import get_workspace_context


@pytest.mark.asyncio
async def test_internal_key_accepts_x_api_key_header() -> None:
    mock_db = AsyncMock()
    with patch("app.deps.get_settings") as p:
        s = MagicMock()
        s.internal_api_key = "secret-key"
        s.internal_api_key_pepper = "pepper"
        p.return_value = s
        ctx = await get_workspace_context(
            db=mock_db, x_api_key="secret-key", authorization=None, x_workspace_id=None
        )
    assert ctx.workspace_id == DEFAULT_WORKSPACE_ID
    assert ctx.is_master is True


@pytest.mark.asyncio
async def test_internal_key_accepts_bearer() -> None:
    mock_db = AsyncMock()
    with patch("app.deps.get_settings") as p:
        s = MagicMock()
        s.internal_api_key = "secret-key"
        s.internal_api_key_pepper = "pepper"
        p.return_value = s
        ctx = await get_workspace_context(
            db=mock_db, x_api_key=None, authorization="Bearer secret-key", x_workspace_id=None
        )
    assert ctx.workspace_id == DEFAULT_WORKSPACE_ID


@pytest.mark.asyncio
async def test_internal_key_rejects_wrong_key() -> None:
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    with patch("app.deps.get_settings") as p:
        s = MagicMock()
        s.internal_api_key = "secret-key"
        s.internal_api_key_pepper = "pepper"
        p.return_value = s
        with pytest.raises(HTTPException) as ei:
            await get_workspace_context(
                db=mock_db, x_api_key="wrong", authorization=None, x_workspace_id=None
            )
        assert ei.value.status_code == 401


@pytest.mark.asyncio
async def test_internal_key_missing_config_returns_503() -> None:
    mock_db = AsyncMock()
    with patch("app.deps.get_settings") as p:
        s = MagicMock()
        s.internal_api_key = ""
        s.internal_api_key_pepper = "pepper"
        p.return_value = s
        with pytest.raises(HTTPException) as ei:
            await get_workspace_context(db=mock_db, x_api_key="x", authorization=None, x_workspace_id=None)
        assert ei.value.status_code == 503
