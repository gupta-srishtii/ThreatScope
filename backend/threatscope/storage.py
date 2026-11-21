"""Transactional, dataset-scoped SQLite/PostgreSQL persistence."""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, create_engine, event, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool

from threatscope.rules import analyze
from threatscope.schemas import Alert, Event


class Base(DeclarativeBase):
    pass


class DatasetRow(Base):
    __tablename__ = "datasets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    source: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    event_count: Mapped[int]


class EventRow(Base):
    __tablename__ = "events"
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    severity: Mapped[str] = mapped_column(String(10), index=True)
    action: Mapped[str] = mapped_column(String(30))
    outcome: Mapped[str] = mapped_column(String(10))
    search_text: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSON)


class AlertRow(Base):
    __tablename__ = "alerts"
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    status: Mapped[str] = mapped_column(String(20), default="open")
    payload: Mapped[dict] = mapped_column(JSON)


class NoteRow(Base):
    __tablename__ = "notes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dataset_id: Mapped[str] = mapped_column(ForeignKey("datasets.id", ondelete="CASCADE"), index=True)
    alert_id: Mapped[str] = mapped_column(String(80))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def database(url: str):
    kwargs = {"connect_args": {"check_same_thread": False, "timeout": 30}} if url.startswith("sqlite") else {}
    if url in ("sqlite://", "sqlite:///:memory:"):
        kwargs["poolclass"] = StaticPool
    engine = create_engine(url, **kwargs, pool_pre_ping=True)
    if url.startswith("sqlite"):
        @event.listens_for(engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
    Base.metadata.create_all(engine)
    return engine, sessionmaker(engine, expire_on_commit=False)


def save_dataset(session: Session, name: str, source: str, events: list[Event]) -> DatasetRow:
    dataset = DatasetRow(id=str(uuid4()), name=name, source=source, created_at=datetime.now(timezone.utc),
                         event_count=len(events))
    session.add(dataset)
    session.flush()
    for e in events:
        session.add(EventRow(dataset_id=dataset.id, id=e.id, timestamp=e.timestamp, severity=e.severity.value,
            action=e.action, outcome=e.outcome,
            search_text=" ".join([e.id, e.user, e.source_ip, e.host, e.message]).lower(),
            payload=e.model_dump(mode="json")))
    for a in analyze(events):
        session.add(AlertRow(dataset_id=dataset.id, id=a.id, status=a.status, payload=a.model_dump(mode="json")))
    session.commit()
    return dataset


def load_events(session: Session, dataset_id: str) -> list[Event]:
    rows = session.scalars(select(EventRow).where(EventRow.dataset_id == dataset_id)
                           .order_by(EventRow.timestamp, EventRow.id))
    return [Event.model_validate(row.payload) for row in rows]


def load_alerts(session: Session, dataset_id: str) -> list[Alert]:
    rows = session.scalars(select(AlertRow).where(AlertRow.dataset_id == dataset_id))
    return sorted([Alert.model_validate({**r.payload, "status": r.status}) for r in rows],
                  key=lambda a: (a.timestamp, a.id), reverse=True)
