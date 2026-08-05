import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_verification_email(to_email: str, token: str) -> None:
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"

    message = EmailMessage()
    message["Subject"] = "Xác nhận tài khoản của bạn"
    message["From"] = settings.email_from
    message["To"] = to_email
    message.set_content(
        f"Chào bạn,\n\nNhấn vào link sau để kích hoạt tài khoản:\n{verify_url}\n\n"
        f"Link có hiệu lực trong {settings.email_verification_expire_minutes} phút."
    )
    message.add_alternative(
        f"""\
        <p>Chào bạn,</p>
        <p>Nhấn vào nút bên dưới để kích hoạt tài khoản:</p>
        <p><a href="{verify_url}">Kích hoạt tài khoản</a></p>
        <p>Link có hiệu lực trong {settings.email_verification_expire_minutes} phút.</p>
        """,
        subtype="html",
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(message)
