import { describe, it, expect } from "vitest";
import { parseTrustProxy } from "./config.js";

describe("parseTrustProxy", () => {
  it("returns undefined when unset or empty", () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
    expect(parseTrustProxy("")).toBeUndefined();
    expect(parseTrustProxy("  ")).toBeUndefined();
  });

  it("returns a number for a hop count", () => {
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy("2")).toBe(2);
    expect(parseTrustProxy(" 1 ")).toBe(1);
  });

  it.each(["true", "abc", "-1", "1.5"])("throws on invalid value %j", (value) => {
    expect(() => parseTrustProxy(value)).toThrow(/TRUST_PROXY/);
  });
});
