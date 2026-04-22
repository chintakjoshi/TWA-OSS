from collections.abc import Callable, Generator

from sqlalchemy.orm import Session

from app.db.base import SessionLocal

SessionFactory = Callable[[], Session]


def get_db_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def get_db_session_factory() -> SessionFactory:
    return SessionLocal
