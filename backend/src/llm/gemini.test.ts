import { describe, it, expect } from "vitest";
import { ApiError } from "@google/genai";
import { LlmError, toLlmError } from "./gemini.js";

const apiError = (status: number) => new ApiError({ message: `HTTP ${status}`, status });

describe("toLlmError", () => {
  it("maps 429 to RATE_LIMITED", () => {
    const err = toLlmError(apiError(429));
    expect(err).toBeInstanceOf(LlmError);
    expect((err as LlmError).code).toBe("RATE_LIMITED");
  });

  it.each([500, 503])("maps %i to UNAVAILABLE", (status) => {
    expect((toLlmError(apiError(status)) as LlmError).code).toBe("UNAVAILABLE");
  });

  it("maps timeouts and network failures to UNAVAILABLE", () => {
    const timeout = new DOMException("This operation was aborted", "AbortError");
    expect((toLlmError(timeout) as LlmError).code).toBe("UNAVAILABLE");
    expect((toLlmError(new TypeError("fetch failed")) as LlmError).code).toBe("UNAVAILABLE");
  });

  it.each([400, 401, 403])("rethrows %i unchanged (our bug, not an outage)", (status) => {
    const original = apiError(status);
    expect(toLlmError(original)).toBe(original);
  });

  it("keeps the original error as the cause", () => {
    const original = apiError(503);
    expect((toLlmError(original) as LlmError).cause).toBe(original);
  });
});
