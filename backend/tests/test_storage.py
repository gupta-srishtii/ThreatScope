import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from threatscope.models.storage import DatasetRow, EventRow, database, load_alerts, load_events, save_dataset
from threatscope.services.synthetic import generate


def test_dataset_scoping_and_cascade():
    engine, sessions = database("sqlite://")
    with sessions() as session:
        events = generate()
        a = save_dataset(session, "A", "synthetic", events)
        b = save_dataset(session, "B", "synthetic", events)
        assert load_events(session, a.id) == events
        assert len(load_alerts(session, a.id)) == 4
        session.execute(delete(DatasetRow).where(DatasetRow.id == a.id))
        session.commit()
        assert not load_events(session, a.id)
        assert len(load_events(session, b.id)) == len(events)
    engine.dispose()


def test_duplicate_event_rolls_back_dataset():
    engine, sessions = database("sqlite://")
    with sessions() as session:
        e = generate("baseline", count=20)[0]
        with pytest.raises(IntegrityError):
            save_dataset(session, "Bad", "upload", [e, e])
        session.rollback()
        assert not session.scalars(select(DatasetRow)).all()
        assert not session.scalars(select(EventRow)).all()
    engine.dispose()
