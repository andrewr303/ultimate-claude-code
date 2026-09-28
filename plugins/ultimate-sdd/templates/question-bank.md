# PRD Discovery Question Bank

REQ-level (implementation) questions live in `templates/req-question-bank.md`. This file is product discovery only.

Ask questions in waves, not all at once. Pick the 3–5 highest-leverage
unknowns per wave. Stop when answers stop changing the PRD.

## Wave 1 — Frame the problem (always ask)
1. What problem does this solve, in one sentence, for whom?
2. What do those users do TODAY without this? (the current workaround is the real competitor)
3. What evidence do you have that this is a problem worth solving? (data, tickets, interviews, gut?)
4. Why now — what happens if we do nothing for 6 months?
5. What will you look at 90 days after launch to decide if it worked?

## Wave 2 — Scope and shape
6. What is explicitly OUT of scope for v1?
7. What's the smallest version that would still be worth shipping?
8. Who is the primary persona — and who do we accept serving badly?
9. Are there existing features this replaces, overlaps, or must integrate with?
10. What does the user journey look like end to end — where does it start and end?

## Wave 3 — Constraints and reality
11. Hard deadlines or external events driving timing?
12. Platform constraints (mobile/web/API/offline)?
13. Any compliance, legal, privacy constraints? (user data involved?)
14. What's the expected scale — users, requests, data volume — at launch and in a year?
15. Team/budget constraints that bound the solution space?

## Wave 4 — Failure and edges
16. What's the most expensive way this could fail quietly? (silent data corruption > loud crash)
17. What happens with zero data / empty state? At limits/quotas?
18. What if two users act on the same thing at once?
19. How could a bad actor abuse this?
20. If we ship it and it's wrong, how do we turn it off, and who is harmed in the meantime?

## Wave 5 — Organization and rollout
21. Who has to say yes for this to ship (approvers), and who will be surprised (stakeholders)?
22. Which teams/systems does this depend on? Are they aware?
23. Full launch or ramp? What would pause the ramp?
24. Does support/docs/sales need anything before launch?
25. What existing users/data must be migrated, and what's the deprecation story?

## Persona-specific probes

**B2B/SaaS**: seats & roles? admin controls? audit logs? SSO? tenant isolation? contractual SLAs?
**Consumer**: onboarding friction budget? virality/sharing? notifications? app-store constraints?
**API/Platform**: versioning policy? rate limits? backwards compatibility promise? SDK support? deprecation timelines?
**Data/ML**: training data provenance? accuracy targets & failure UX? feedback loops? drift monitoring? explainability requirements?
**Internal tools**: who maintains it long-term? what's the cost of the manual process it replaces?

## Techniques

- **Pre-mortem**: "It's 6 months post-launch and this failed. What happened?" — surfaces risks users won't volunteer.
- **Inversion**: "What would guarantee this fails?" — turns into non-goals and guardrails.
- **Five whys**: chase stated wants down to underlying needs before writing requirements.
- **Magic wand**: "If constraints vanished, what would this look like?" — separates essential from incidental scope.
- **Kill the feature**: "What would have to be true for us to NOT build this?" — tests conviction and finds the real hypothesis.
