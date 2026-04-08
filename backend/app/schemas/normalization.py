from __future__ import annotations

import math
import re
from functools import lru_cache
from typing import Annotated

import pgeocode
from pydantic import AfterValidator, BeforeValidator

_WHITESPACE_PATTERN = re.compile(r"\s+")
_NON_DIGIT_PATTERN = re.compile(r"\D")


def _collapse_single_line_whitespace(value: object) -> object:
    if not isinstance(value, str):
        return value
    return _WHITESPACE_PATTERN.sub(" ", value).strip()


def normalize_required_single_line_text(value: object) -> object:
    return _collapse_single_line_whitespace(value)


def normalize_optional_single_line_text(value: object) -> object:
    normalized = _collapse_single_line_whitespace(value)
    if normalized == "":
        return None
    return normalized


@lru_cache(maxsize=1)
def get_us_zip_lookup() -> pgeocode.Nominatim:
    return pgeocode.Nominatim("us")


def _is_missing(value: object) -> bool:
    if value is None:
        return True
    try:
        if value != value:
            return True
    except TypeError:
        return False
    if isinstance(value, float):
        return math.isnan(value)
    return False


def normalize_optional_us_zip_code(value: object) -> object:
    normalized = normalize_optional_single_line_text(value)
    if normalized is None or not isinstance(normalized, str):
        return normalized

    digits = _NON_DIGIT_PATTERN.sub("", normalized)
    if len(digits) == 5:
        canonical_zip = digits
    elif len(digits) == 9:
        canonical_zip = f"{digits[:5]}-{digits[5:]}"
    else:
        raise ValueError("Enter a valid US ZIP code.")

    record = get_us_zip_lookup().query_postal_code(digits[:5])
    country_code = record.get("country_code")
    if _is_missing(country_code):
        raise ValueError("Enter a valid US ZIP code.")
    return canonical_zip


NormalizedRequiredSingleLineText = Annotated[
    str,
    BeforeValidator(normalize_required_single_line_text),
]
NormalizedOptionalSingleLineText = Annotated[
    str | None,
    BeforeValidator(normalize_optional_single_line_text),
]
NormalizedOptionalUsZipCode = Annotated[
    str | None,
    AfterValidator(normalize_optional_us_zip_code),
]
