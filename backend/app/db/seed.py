from __future__ import annotations

import os

from app.db.base import SessionLocal
from app.db.seeds import _env_uuid, seed_defaults


def main() -> None:
    staff_auth_user_id = _env_uuid("TWA_SEED_STAFF_AUTH_USER_ID")
    staff_email = os.getenv("TWA_SEED_STAFF_EMAIL")
    staff_auth_provider_role = os.getenv("TWA_SEED_STAFF_PROVIDER_ROLE", "admin")

    with SessionLocal() as session:
        results = seed_defaults(
            session,
            staff_auth_user_id=staff_auth_user_id,
            staff_email=staff_email,
            staff_auth_provider_role=staff_auth_provider_role,
        )

    print(results)


if __name__ == "__main__":
    main()
