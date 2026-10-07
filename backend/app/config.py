from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # Legacy single key — kept as a fallback if neither per-account key below is set.
    resend_api_key: str = ""

    # Two Resend accounts, one signed up with each person's email — each can only
    # deliver to the address it was signed up with, so email.py picks whichever
    # key matches who the password reset is actually for.
    resend_api_key_owner: str = ""
    resend_api_key_supervisor: str = ""
    owner_email: str = ""
    supervisor_email: str = ""

    frontend_url: str = "http://localhost:3000"

    at_username: str = "sandbox"
    at_api_key: str = ""
    at_default_country_code: str = "+254"  # Kenya — used only for numbers typed without a country code

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()