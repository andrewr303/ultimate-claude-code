# Launches Specification

## Purpose

Upcoming rocket launches: the list a visitor uses to see what is flying next.

## Requirements

### Requirement: Upcoming List
The system SHALL list upcoming launches with name, net datetime, rocket, and mission summary.

#### Scenario: Has launches
- GIVEN the LL2 client returns at least one upcoming launch
- WHEN the list renders
- THEN each row shows name, net datetime, rocket, and mission summary

### Requirement: Location And Provider Filters
The system SHALL filter the list using Launch Library 2 `location__ids` and `lsp__ids`.

#### Scenario: Filter by pad
- GIVEN launches at more than one location
- WHEN the visitor selects a location
- THEN only launches at that location remain
