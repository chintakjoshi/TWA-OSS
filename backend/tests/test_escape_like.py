from __future__ import annotations

from app.services.common import escape_like


class TestEscapeLike:
    def test_plain_text_unchanged(self) -> None:
        assert escape_like("hello world") == "hello world"

    def test_escapes_percent(self) -> None:
        assert escape_like("100%") == r"100\%"

    def test_escapes_underscore(self) -> None:
        assert escape_like("some_value") == r"some\_value"

    def test_escapes_backslash(self) -> None:
        assert escape_like(r"path\to") == r"path\\to"

    def test_backslash_escaped_before_percent_and_underscore(self) -> None:
        """Backslash must be escaped first to avoid double-escaping."""
        assert escape_like(r"\%\_") == r"\\\%\\\_"

    def test_multiple_wildcards(self) -> None:
        assert escape_like("%_%_%") == r"\%\_\%\_\%"

    def test_empty_string(self) -> None:
        assert escape_like("") == ""

    def test_only_special_characters(self) -> None:
        assert escape_like("%_\\") == r"\%\_\\"

    def test_mixed_content(self) -> None:
        assert escape_like("hello%world_test") == r"hello\%world\_test"
