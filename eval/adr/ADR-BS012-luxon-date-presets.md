# ADR-BS012: Display dates with Luxon locale presets, not custom formats

- **Status:** Accepted (Backstage ADR 012)
- **Source:** https://github.com/backstage/backstage/blob/master/docs/architecture-decisions/adr012-use-luxon-locale-and-date-presets.md
- **Driver:** locale-consistent, unambiguous date display in the UI

## Context

Users interpret dates differently based on locale. Custom date formats produce
inconsistent and unfamiliar output and risk misinterpretation — e.g. `05/03/2021`
could read as March 5th or May 3rd depending on the reader. Backstage therefore
standardised on Luxon's locale-aware presets for all UI date/time display, so the
rendered value always matches the viewer's locale conventions instead of a
hard-coded pattern.

## Decision

UI code MUST render dates/times with Luxon's `toLocaleString` and a locale preset
(e.g. `DateTime.DATE_MED`, `DateTime.DATETIME_MED`). Custom `toFormat(...)` pattern
strings MUST NOT be used for values shown to users.

```constraints
- id: ADR-BS012-C1
  adr: ADR-BS012
  title: Display dates with Luxon locale presets, not custom toFormat
  rule: >
    UI date/time values shown to users must be formatted with Luxon's
    toLocaleString using a locale preset (DateTime.DATE_MED, DATETIME_MED, etc.).
    Custom toFormat(...) pattern strings (e.g. 'yyyy-MM-dd hh:mm:ss') must not be
    used for displayed dates, because a hard-coded pattern fixes one locale/order
    and causes misreading across locales.
  polarity: prohibition
  driver: "ADR012 — locale-consistent, unambiguous date display"
  scope:
    paths: ["**/*.tsx"]
    layers: ["ui"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "DateTime.fromISO(ts).toLocaleString(DateTime.DATETIME_MED)"
      violating:
        - "dt.toFormat('yyyy-MM-dd hh:mm:ss ZZZZ')"
  enforce: advisory
  severity: medium
  status: active
  superseded_by: null
```
