import { describe, it, expect, vi, afterEach } from "vitest";
import { fail } from "./util.ts";

describe("fail", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls console.error with 'error: <msg>' and process.exit(2)", () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((c?: number) => {
        throw new Error(`exit:${c}`);
      }) as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => fail("boom")).toThrow("exit:2");
    expect(errSpy).toHaveBeenCalledWith("error: boom");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});
