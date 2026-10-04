import { describe, it, expect } from "vitest";
import { normalizeText } from "./normalizeText.js";

// Special characters are written as \u escapes so invisible ones stay visible here.

describe("normalizeText", () => {
  it("converts ligatures into normal letters", () => {
    expect(normalizeText("ﬁnance")).toBe("finance");
  });

  it("converts non-breaking spaces into normal spaces", () => {
    expect(normalizeText("New York")).toBe("New York");
  });

  it("combines a letter and a separate accent into one character", () => {
    const input = "José"; // "e" followed by a combining accent mark
    expect(input.length).toBe(5);

    const output = normalizeText(input);
    expect(output).toBe("José"); // single "é" character
    expect(output.length).toBe(4);
  });

  it.each([
    ["zero-width space", "Ja​ne"],
    ["zero-width non-joiner", "Ja‌ne"],
    ["zero-width joiner", "Ja‍ne"],
    ["byte order mark", "Ja﻿ne"],
    ["soft hyphen", "Ja­ne"],
  ])("removes invisible character: %s", (_name, input) => {
    expect(normalizeText(input)).toBe("Jane");
  });

  it("trims the result", () => {
    expect(normalizeText("  \n Jane \n ")).toBe("Jane");
  });

  it("leaves meaningful characters alone", () => {
    const input = "C++ / C# / Node.js — José Müller • 2019–2021";
    expect(normalizeText(input)).toBe(input);
  });

  it("keeps line structure, including the page separator", () => {
    const input = "Line one\n\nLine two";
    expect(normalizeText(input)).toBe(input);
  });

  it("is idempotent", () => {
    const messy = "  ﬁnance team​\nJosé  ";
    const once = normalizeText(messy);
    expect(normalizeText(once)).toBe(once);
  });
});
