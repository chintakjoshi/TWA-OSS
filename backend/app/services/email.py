from __future__ import annotations

import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


class EmailDeliveryError(Exception):
    pass



def send_email_message(*, recipient: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.notification_email_enabled:
        return

    message = EmailMessage()
    message["From"] = settings.email_from
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(
            host=settings.smtp_host,
            port=settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
        ) as smtp:
            smtp.send_message(message)
    except OSError as exc:
        raise EmailDeliveryError(str(exc)) from exc
