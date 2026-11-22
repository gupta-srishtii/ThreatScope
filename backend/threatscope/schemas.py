"""Strict normalized contracts. All timestamps are timezone-aware UTC."""

from datetime import datetime, timezone
from enum import StrEnum
from ipaddress import ip_address
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Severity(StrEnum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class Event(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: str = Field(min_length=1, max_length=80, pattern=r"^[a-zA-Z0-9_-]+$")
    timestamp: datetime
    source_ip: str = Field(max_length=45)
    user: str = Field(min_length=1, max_length=120)
    host: str = Field(min_length=1, max_length=120)
    action: Literal["login", "file_access", "process_start", "network_connection"]
    outcome: Literal["success", "failure", "allowed", "blocked"]
    severity: Severity = Severity.info
    bytes_sent: int = Field(default=0, ge=0, le=10**12, strict=True)
    message: str = Field(default="", max_length=1000)
    label: Literal["benign", "suspicious"] | None = None

    @field_validator("timestamp")
    @classmethod
    def utc_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timestamp must include a timezone")
        return value.astimezone(timezone.utc)

    @field_validator("timestamp", mode="before")
    @classmethod
    def iso_timestamp(cls, value):
        if (
            not isinstance(value, (str, datetime))
            or isinstance(value, str)
            and ("T" not in value or len(value) > 64)
        ):
            raise ValueError("timestamp must be an ISO 8601 datetime with a timezone")
        return value

    @field_validator("source_ip")
    @classmethod
    def valid_ip(cls, value: str) -> str:
        return str(ip_address(value))

    @field_validator("user", "host", "message")
    @classmethod
    def no_controls(cls, value: str) -> str:
        if any(ord(c) < 32 or ord(c) == 127 for c in value):
            raise ValueError("control characters are not allowed")
        return value


class Alert(BaseModel):
    id: str
    rule_id: str
    title: str
    severity: Severity
    timestamp: datetime
    entity: str
    explanation: str
    recommendation: str
    event_ids: list[str]
    evidence: dict[str, int | float | str]
    status: Literal["open", "investigating", "resolved"] = "open"


class NoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    body: str = Field(min_length=1, max_length=4000)


class StatusInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: Literal["open", "investigating", "resolved"]
