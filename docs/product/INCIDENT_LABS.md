# Incident labs: current capability and roadmap

The checked-in product provides a **synthetic scenario investigation workflow**, not a timed incident replay player.

## Available walkthrough

1. Launch the demo workspace or choose **Data sources → Demo scenarios**.
2. Select the authentication sequence, activity burst, off-hours login, mixed scenario or quiet baseline and a reproducible seed.
3. Review **Overview** event volume and findings, then **Detections → Investigate**.
4. Inspect exact supporting events and rule thresholds, record a note and triage status.
5. Use **Events** to filter source/user/action/outcome; download reports from **Reports**.

The timeline visualizes the selected snapshot. It does not play a sequence or simulate live collection.

## Planned Incident Replay Lab

Play/pause/restart, forward/backward stepping, replay speed, scrubber markers and replay-time rule emissions require separate feature work. No existing implementation of those controls was found in the pre-refactor audit.

## Planned What-if Detection Lab

Bounded parameter editing, backend recalculation, persisted original/modified configurations and evidence comparison are not implemented. Existing rules retain their original fixed thresholds. False-positive/negative comparisons would require trustworthy labels; uploaded `label` values alone do not establish verified operational ground truth.

These gaps are documented rather than hidden or implemented under a structural-only change request.
