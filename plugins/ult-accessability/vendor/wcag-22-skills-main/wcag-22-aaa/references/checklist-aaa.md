# WCAG 2.2 Level AAA Conformance Checklist

Complete verification checklist for all WCAG 2.2 Level AAA success criteria.

| ID | Criterion | Level | Verification Method | Common Failure Points & Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **1.2.6** | Sign Language (Prerecorded) | AAA | Video review | Pre-recorded audio content in synchronized media lacks a synchronized sign language interpreter video. Add picture-in-picture sign language video. |
| **1.2.7** | Extended Audio Description | AAA | Video review | Video has pauses that are too short to describe visual actions. Provide secondary version with pauses inserted or extended audio description track. |
| **1.2.8** | Media Alternative (Prerecorded) | AAA | Document review | Pre-recorded synchronized media or video-only content lacks a full narrative text transcript describing all visual and auditory content. |
| **1.2.9** | Audio-only (Live) | AAA | Live broadcast check | Live audio-only broadcast (e.g., live radio stream) lacks a real-time verbatim text transcript service. |
| **1.4.6** | Contrast (Enhanced) | AAA | Color contrast analyzer | Text has less than 7:1 contrast ratio (normal text) or less than 4.5:1 (large text ≥ 24px or ≥ 18.66px bold). Use darker text or lighter backgrounds. |
| **1.4.7** | Low or No Background Audio | AAA | Audio analyzer | Background music/sound in dialogue audio is not at least 20 dB quieter than foreground speech, or cannot be turned off. |
| **1.4.8** | Visual Presentation | AAA | Typography inspection | Text blocks exceed 80 characters per line, line height is less than 1.5, paragraph spacing is less than 2.25x line height, text is justified, or user cannot change background/foreground colors. |
| **1.4.9** | Images of Text (No Exception) | AAA | Code inspection | Text rendered inside bitmap images (PNG/JPEG) instead of styled HTML text. Only brand logos and essential images are exempt. |
| **2.1.3** | Keyboard (No Exception) | AAA | Keyboard test | Any feature requires a mouse or gesture with no keyboard alternative. Unlike 2.1.1, zero exceptions are allowed. |
| **2.2.3** | No Timing | AAA | Timer audit | Application imposes time limits on user actions (except non-interactive broadcasts or real-time auctions). Remove all artificial session timeout countdowns. |
| **2.2.4** | Interruptions | AAA | Alert inspection | Push notifications, promotional popups, or urgent banners interrupt users without a preference to postpone or silence them. |
| **2.2.5** | Re-authenticating | AAA | Session expiry test | When an authentication token expires mid-form, the user loses their form data upon logging back in. Cache form state in secure local storage and restore after re-login. |
| **2.2.6** | Timeouts | AAA | Inactivity test | Users are not warned at the start of their session about the duration of inactivity that causes automatic logout and data loss. |
| **2.3.2** | Three Flashes | AAA | PEAT analyzer | Any element flashes more than 3 times in any 1-second period. Zero exceptions allowed. |
| **2.3.3** | Animation from Interactions | AAA | Motion test | Motion animations triggered by interaction (scrolling, clicking, hovering) cannot be disabled by user or do not honor `prefers-reduced-motion`. |
| **2.4.8** | Location | AAA | Site navigation review | User cannot determine where they are within the site hierarchy. Provide breadcrumb trails or hierarchical sitemaps. |
| **2.4.9** | Link Purpose (Link Only) | AAA | Link list review | Link text relies on surrounding sentences to make sense ("Read more", "Click here"). Link text itself must clearly identify destination. |
| **2.4.10** | Section Headings | AAA | Heading hierarchy check | Visual sections of content lack descriptive HTML heading elements (`<h2>`, `<h3>`). |
| **2.4.12** | Focus Not Obscured (Enhanced) | **AAA (2.2)** | Tab through sticky regions | Any portion of a focused element is covered by a sticky navbar, sticky bottom banner, or floating widget. Use `scroll-margin-top` / `scroll-margin-bottom`. |
| **2.4.13** | Focus Appearance | **AAA (2.2)** | Visual measurement / CSS check | Focus indicator has less than 2px perimeter thickness, or fails 3:1 contrast against both unfocused state and adjacent background. |
| **2.5.5** | Target Size (Enhanced) | AAA | Touch target measurement | Interactive pointer target size is smaller than 44×44 CSS pixels. Increase button padding or hit areas. |
| **2.5.6** | Concurrent Input Mechanisms | AAA | Device test | Web application restricts user from using mouse and touch screen simultaneously, or blocks switching to keyboard. |
| **3.1.3** | Unusual Words | AAA | Content review | Industry jargon, technical terms, or idioms used without inline `<dfn>`, glossary link, or tooltip definition. |
| **3.1.4** | Abbreviations | AAA | HTML inspection | Abbreviations and acronyms used without `<abbr title="...">` or expanded definition on first occurrence. |
| **3.1.5** | Reading Level | AAA | Readability analyzer | Text exceeds lower secondary education level (approx. grade 8-9) without providing an executive summary or simplified plain-language version. |
| **3.1.6** | Pronunciation | AAA | Linguistic check | Words whose meaning changes based on pronunciation lack phonetic pronunciation guides (e.g. `<ruby>` annotations). |
| **3.2.5** | Change on Request | AAA | Interaction test | Context changes (submitting form, opening popups, redirecting) occur without explicit user activation (e.g. clicking a button). |
| **3.3.5** | Error Prevention (All) | AAA | Form flow test | Submissions for any form are irreversible and cannot be reviewed/confirmed before final submission. Provide a confirmation modal and undo window. |
| **3.3.6** | Context-Sensitive Help | AAA | Form field review | Form fields lack inline contextual help or help icons explaining required formats and data usage. |
| **3.3.9** | Accessible Authentication (Enhanced) | **AAA (2.2)** | Auth flow test | Login requires cognitive function tests (passwords to remember, CAPTCHAs, or object/image recognition). Use WebAuthn/Passkeys, magic links, or one-click verification. |
