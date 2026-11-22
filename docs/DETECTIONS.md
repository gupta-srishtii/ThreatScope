# Explainable detection catalog

Deterministic rules run during dataset creation. They read normalized timestamps, source addresses, users, actions and outcomes; uploaded severity and labels do not influence detection. Alert IDs are stable hashes of the rule, entity and supporting event IDs within a dataset. Rules never block sessions, make network requests or execute response actions.

| Rule | Condition | Severity | Evidence / likely false positives |
| --- | --- | --- | --- |
| AUTH-001 | At least 5 failed `login` events for the same `(source_ip, user)` in an inclusive 300-second rolling window | High | Densest window and failure count; stale saved passwords, expired service credentials, client retries |
| AUTH-002 | Successful login preceded by at least 5 failures for the same `(source_ip, user)` within 300 seconds | Critical | Failure events and success event; legitimate password recovery, client retries before successful correction |
| ACT-001 | At least 25 events from one source IP in an inclusive 60-second rolling window | High | Densest window and event count; scheduled batch jobs, shared NAT addresses, ordinary automation |
| AUTH-003 | Successful login outside 06:00 inclusive to 22:00 exclusive UTC | Medium | UTC hour and example policy boundaries; time zones, on-call work, service identities |

These thresholds are teaching defaults. Confirm an organization's authorized working hours, expected automation and identity-provider context before interpreting them operationally.

## Ordering and deduplication

Events sort by UTC timestamp and event ID, making unsorted uploads deterministic. Window boundaries are inclusive; a gap of 300 seconds qualifies for the authentication windows, while 301 seconds does not. Equal timestamps sort by ID because no higher-resolution ordering is available; that ordering cannot prove causality.

AUTH-001 and ACT-001 produce at most one finding per grouped entity per dataset, using its densest window. This intentionally avoids large duplicate queues, but can merge or omit separate episodes in a long dataset. AUTH-002 clears its accumulated failure history after each successful login so later successes do not reuse an earlier sequence. AUTH-003 produces one finding per off-hours successful login.

Counts of flagged events are a union of evidence IDs, so a login shared by two rule findings is counted once. Open investigations include both `open` and `investigating` statuses; resolved findings remain in reports. Severity charts count rule findings, not imported event severities or ML candidates.

## Investigation workflow

1. Load a labeled synthetic scenario or an authorized event sample.
2. Review the overview and open **Detections**. Filter by status, rule, user or source.
3. Choose **Investigate**, inspect the explanation, threshold evidence and supporting events.
4. Verify the hypothesis using authorized context outside this tool. Record findings as plain-text notes.
5. Set the status and export the JSON investigation report plus event CSV when needed.

Notes and statuses persist in the selected database. Notes have no author field because authentication is a shared workspace key. A resolved status records analyst triage; it does not prove that a system is secure.

## Coverage boundaries

There are no geolocation, impossible-travel, threat-intelligence, malware, credential validation, network scanning or exploitation features. Cross-user password spraying is not covered by the same-user authentication rules. Missing, aggregated, delayed or inaccurate source logs can hide or distort patterns. Absence of findings is not evidence of safety. See [the ML methodology](ML.md) for the optional anomaly layer.
