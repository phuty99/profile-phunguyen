from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # App
    secret_key: str
    access_token_expire_minutes: int = 60 * 24
    email_verification_expire_minutes: int = 60 * 24
    frontend_url: str = "http://localhost:5173"

    # Database
    database_url: str

    # AWS S3
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str
    s3_bucket_name: str

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Brevo SMTP
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    email_from: str


settings = Settings()
