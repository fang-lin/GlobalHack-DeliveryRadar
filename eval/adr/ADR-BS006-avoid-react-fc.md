# ADR-BS006: Avoid React.FC / React.SFC in new code

- **Status:** Accepted (Backstage ADR 006)
- **Source:** https://github.com/backstage/backstage/blob/master/docs/architecture-decisions/adr006-avoid-react-fc.md
- **Driver:** component typing correctness

## Context

`React.FC` implicitly adds a `children` prop even to components that take none,
and it does not support a generic type for `children`. Facebook removed
`React.FC` from their TypeScript project template, judging it "an unnecessary
feature with next to no benefits in combination with a few downsides." Backstage
therefore avoids it in new code and gradually removes existing usage. Note this
is a project-specific decision: in the wider ecosystem `React.FC` is common and
many style guides treat it as fine — so a generic best-practice reviewer will
not flag it.

## Decision

New components MUST NOT be typed with `React.FC` or `React.SFC`. Declare props
explicitly on a plain function component instead.

```constraints
- id: ADR-BS006-C1
  adr: ADR-BS006
  title: Avoid React.FC / React.SFC in new code
  rule: >
    New React components must not be typed with React.FC or React.SFC. Declare
    the props type explicitly on a plain function component. React.FC implicitly
    injects a children prop and cannot express a generic children type, so it is
    prohibited for new code.
  polarity: prohibition
  driver: "ADR006 — explicit, correct component typing"
  scope:
    paths: ["**/*.tsx"]
    layers: ["ui"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "export const Foo = (props: FooProps) => { ... }"
      violating:
        - "const Foo: React.FC<FooProps> = (props) => { ... }"
  enforce: advisory
  severity: low
  status: active
  superseded_by: null
```
