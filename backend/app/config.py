from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"

    at_username: str = "sandbox"
    at_api_key: str = ""
    at_default_country_code: str = "+254"  # Kenya — used only for numbers typed without a country code

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()