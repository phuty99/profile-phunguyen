import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_verification_email(to_email: str, token: str) -> None:
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"

    message = EmailMessage()
    message["Subject"] = "Verify your account"
    message["From"] = settings.email_from
    message["To"] = to_email
    message.set_content(
        f"Hi,\n\nClick the link below to activate your account:\n{verify_url}\n\n"
        f"This link is valid for {settings.email_verification_expire_minutes} minutes."
    )
    message.add_alternative(
        f"""\
        <p>Hi,</p>
        <p>Click the button below to activate your account:</p>
        <p><a href="{verify_url}">Activate account</a></p>
        <p>This link is valid for {settings.email_verification_expire_minutes} minutes.</p>
        """,
        subtype="html",
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)
