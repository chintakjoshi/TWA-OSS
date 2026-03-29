from __future__ import annotations

import pytest

from app.core.config import Settings


def test_debug_defaults_to_false(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("TWA_DEBUG", raising=False)
    settings = Settings(_env_file=None)

    assert settings.debug is False


def test_debug_can_be_enabled_explicitly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TWA_DEBUG", "true")
    settings = Settings(_env_file=None)

    assert settings.debug is True
