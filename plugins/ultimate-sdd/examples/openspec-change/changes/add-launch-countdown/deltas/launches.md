## MODIFIED Requirements

### Requirement: Upcoming List
The system SHALL list upcoming launches with name, net datetime, rocket, mission summary, and a live countdown to `net`.

(Previously: no countdown.)

#### Scenario: Has launches
- GIVEN the LL2 client returns at least one upcoming launch
- WHEN the list renders
- THEN each row shows name, net datetime, rocket, mission summary, and a countdown

## ADDED Requirements

### Requirement: Launch Countdown
The system SHALL show a live countdown to each launch's `net` on its list row, formatted `T-HH:MM:SS` before net and `T+HH:MM:SS` after.

#### Scenario: Future launch
- GIVEN a launch with `net` 90 minutes ahead
- WHEN the list renders
- THEN the row shows `T-01:30:00` and the value decreases each second

#### Scenario: Liftoff passed
- GIVEN a launch whose `net` is 10 seconds in the past
- WHEN the list renders
- THEN the row shows `T+00:00:10`
