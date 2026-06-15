window.EVAL_DATA = {
  "model": "claude-sonnet-4-6",
  "n": 7,
  "rows": [
    {
      "id": "adr012-violated-pr28986",
      "gold": "violated",
      "adr": "ADR-BS012-C1",
      "capability": "conformance",
      "realness": "real-merged-pr",
      "source": "https://github.com/backstage/backstage/pull/28986",
      "grounded": {
        "result": "violated",
        "confidence": 0.97,
        "explanation": "The updated function still returns `strDateTime.toFormat('yyyy-MM-dd hh:mm:ss ZZZZ')`, a hard-coded custom pattern string, for the value that is ultimately displayed to users. This directly violates the prohibition on using `toFormat(...)` for UI-displayed dates."
      },
      "ungrounded": {
        "result": "aligned",
        "confidence": 0.72,
        "explanation": "The refactoring is cleaner: using `toISOString()` and `DateTime.fromISO` is more robust than calling `toLocaleString()` then parsing with a fixed format string. One pre-existing issue (`hh` is 12-hour clock, should be `HH` for 24-hour) is carried over but not introduced by this diff. The implicit assumption that string inputs are ISO-formatted should be consistent with callers."
      }
    },
    {
      "id": "adr012-aligned-preset",
      "gold": "aligned",
      "adr": "ADR-BS012-C1",
      "capability": "conformance",
      "realness": "constructed-compliant-example",
      "source": null,
      "grounded": {
        "result": "aligned",
        "confidence": 0.98,
        "explanation": "The diff replaces a raw ISO string display with `DateTime.fromISO(iso).toLocaleString(DateTime.DATETIME_MED)`, which is exactly the locale-aware preset pattern mandated by ADR-BS012-C1. No custom `toFormat` pattern strings are introduced."
      },
      "ungrounded": {
        "result": "aligned",
        "confidence": 0.85,
        "explanation": "The change correctly converts an ISO timestamp to a locale-aware human-readable string while preserving the raw ISO value as a tooltip, which is a straightforward and sensible improvement. No edge cases like invalid ISO strings are handled, but that's a minor omission rather than a blocking issue."
      }
    },
    {
      "id": "out-of-scope-docs",
      "gold": "out-of-scope",
      "adr": null,
      "capability": "retrieval",
      "realness": "representative",
      "source": null,
      "grounded": {
        "result": "no-fire",
        "confidence": null,
        "explanation": null
      },
      "ungrounded": {
        "result": "aligned",
        "confidence": 0.9,
        "explanation": "The diff simply adds a documentation sentence explaining how to override the backend base URL. No code logic, security, or correctness issues are introduced."
      }
    },
    {
      "id": "adr006-react-fc-violated",
      "gold": "violated",
      "adr": "ADR-BS006-C1",
      "capability": "conformance",
      "realness": "constructed-probe",
      "source": null,
      "grounded": {
        "result": "violated",
        "confidence": 0.99,
        "explanation": "The new component `StatusLabel` is typed as `React.FC<StatusLabelProps>`, which is explicitly prohibited by ADR-BS006-C1. This implicitly injects a `children` prop and uses the banned typing pattern."
      },
      "ungrounded": {
        "result": "aligned",
        "confidence": 0.9,
        "explanation": "The component is a straightforward, well-typed presentational badge that maps a constrained union type to a CSS class and display text. No issues with the implementation."
      }
    },
    {
      "id": "adr014-nodefetch-supersede",
      "gold": "violated",
      "adr": "ADR-BS014-C1",
      "capability": "conformance",
      "realness": "real-code",
      "source": "packages/backend-defaults/src/entrypoints/urlReader/lib/GithubUrlReader.ts",
      "grounded": {
        "result": "violated",
        "confidence": 0.99,
        "explanation": "The diff explicitly adds `import fetch, { RequestInit, Response } from 'node-fetch'`, which is precisely the import pattern prohibited by ADR-BS014-C1. Node.js 20+ provides native global `fetch`, `RequestInit`, and `Response` without any import."
      },
      "ungrounded": {
        "result": "aligned",
        "confidence": 0.75,
        "explanation": "Explicitly importing `fetch`, `RequestInit`, and `Response` from `node-fetch` is appropriate here because `node-fetch` provides a Node.js-style readable stream body, which is required by `ReadUrlResponseFactory.fromNodeJSReadable`; relying on the global `fetch` (Node 18+) would yield a Web `ReadableStream` instead. The `Response` import isn't visible in use within this diff, but it may be referenced elsewhere in the file."
      }
    },
    {
      "id": "adr007-adhoc-mock-violated",
      "gold": "violated",
      "adr": "ADR-BS007-C1",
      "capability": "conformance",
      "realness": "constructed-representative",
      "source": null,
      "grounded": {
        "result": "violated",
        "confidence": 0.99,
        "explanation": "The test stubs HTTP by reassigning `global.fetch` with `jest.fn().mockResolvedValue(...)`, which is explicitly prohibited by ADR-BS007-C1. MSW's `setupServer` with `rest`/`http` handlers must be used instead."
      },
      "ungrounded": {
        "result": "violated",
        "confidence": 0.85,
        "explanation": "The `global.fetch` mock is set in `beforeEach` but never restored in an `afterEach`, so the stub leaks into any test files that run afterward in the same Jest worker, potentially causing false positives or hard-to-diagnose failures. Add `afterEach(() => jest.restoreAllMocks())` or save and restore the original `global.fetch` to prevent the leak."
      }
    },
    {
      "id": "adr007-msw-aligned",
      "gold": "aligned",
      "adr": "ADR-BS007-C1",
      "capability": "conformance",
      "realness": "real-code",
      "source": "packages/integration/src/gitlab/GitLabIntegration.test.ts",
      "grounded": {
        "result": "aligned",
        "confidence": 0.98,
        "explanation": "The diff introduces MSW-based HTTP mocking via setupServer with rest.get handlers, exactly as required by ADR-BS007-C1. No hand-rolled fetch stubs, global.fetch reassignments, or nock usage are present."
      },
      "ungrounded": {
        "result": "unknown",
        "confidence": 0.55,
        "explanation": "The MSW server setup follows a standard pattern, but the intercepted URL `https://h.com/api/v4` looks like a placeholder or truncated hostname rather than a realistic GitLab test URL. Without seeing the rest of the test file it's impossible to confirm whether this handler actually matches the URLs used in the tests, or if it will silently never fire."
      }
    }
  ],
  "metrics": {
    "grounded": {
      "p": 1,
      "r": 1,
      "f1": 1,
      "tp": 4,
      "fp": 0,
      "fn": 0
    },
    "ungrounded": {
      "p": 1,
      "r": 0.25,
      "f1": 0.4,
      "tp": 1,
      "fp": 0,
      "fn": 3
    },
    "retrieval": {
      "ok": 1,
      "total": 1
    }
  }
};
