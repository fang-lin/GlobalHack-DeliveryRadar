import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./commands/extract.ts", () => ({ cmdExtract: vi.fn().mockResolvedValue(0) }));
vi.mock("./commands/conformance.ts", () => ({ cmdConformance: vi.fn().mockResolvedValue(0) }));
vi.mock("./commands/comment.ts", () => ({ cmdComment: vi.fn().mockResolvedValue(0) }));
vi.mock("./commands/capture.ts", () => ({ cmdCapture: vi.fn().mockResolvedValue(0) }));
vi.mock("./util.ts", () => ({ fail: vi.fn() }));

import { dispatch } from "./main.ts";
import { cmdExtract } from "./commands/extract.ts";
import { cmdConformance } from "./commands/conformance.ts";
import { cmdComment } from "./commands/comment.ts";
import { cmdCapture } from "./commands/capture.ts";
import { fail } from "./util.ts";

beforeEach(() => vi.clearAllMocks());

describe("dispatch", () => {
  it("routes 'extract' to cmdExtract with remaining args", async () => {
    await dispatch(["extract", "--adr-dir", "docs/adr"]);
    expect(cmdExtract).toHaveBeenCalledOnce();
    expect(cmdExtract).toHaveBeenCalledWith(["--adr-dir", "docs/adr"]);
  });

  it("routes 'conformance' with remaining args", async () => {
    await dispatch(["conformance", "--diff", "x"]);
    expect(cmdConformance).toHaveBeenCalledOnce();
    expect(cmdConformance).toHaveBeenCalledWith(["--diff", "x"]);
  });

  it("routes 'comment' with remaining args", async () => {
    await dispatch(["comment", "--verdicts", "v.json"]);
    expect(cmdComment).toHaveBeenCalledOnce();
    expect(cmdComment).toHaveBeenCalledWith(["--verdicts", "v.json"]);
  });

  it("routes 'capture' with remaining args", async () => {
    await dispatch(["capture", "--diff", "y"]);
    expect(cmdCapture).toHaveBeenCalledOnce();
    expect(cmdCapture).toHaveBeenCalledWith(["--diff", "y"]);
  });

  it("calls fail for unknown command containing the command name and 'unknown command'", async () => {
    await dispatch(["bogus"]);
    expect(fail).toHaveBeenCalledOnce();
    const msg = (fail as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain("unknown command");
    expect(msg).toContain("bogus");
  });
});
