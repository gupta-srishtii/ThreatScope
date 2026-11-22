"""CI runs this against an isolated PostgreSQL service; local SQLite runs skip it."""

import os

import pytest
from sqlalchemy import delete

from threatscope.storage import DatasetRow, database, load_alerts, load_events, save_dataset
from threatscope.synthetic import generate


@pytest.mark.skipif(
    not os.getenv("TEST_POSTGRES_URL"), reason="Requires TEST_POSTGRES_URL for an isolated test database"
)
def test_postgresql_persistence_and_cascading_deletion():
    engine, sessions = database(os.environ["TEST_POSTGRES_URL"])
    with sessions() as session:
        events = generate("authentication", seed=98765, count=20)
        row = save_dataset(session, "PostgreSQL integration fixture", "synthetic", events)
        try:
            assert load_events(session, row.id) == events
            assert len(load_alerts(session, row.id)) == 2
        finally:
            session.execute(delete(DatasetRow).where(DatasetRow.id == row.id))
            session.commit()
        assert not load_events(session, row.id)
    engine.dispose()
