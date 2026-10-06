import { describe, it, expect, vi } from "vitest";
import { LlmError, type GenerateJson } from "../llm/gemini.js";
import { parseResume, ResumeParseError } from "./parseResume.js";
import type { Resume } from "./schema.js";

const resume: Resume = {
  contact: { fullName: "Jane Doe", email: "jane@example.com", phone: null, location: null, links: [] },
  summary: null,
  experience: [],
  education: [],
  skills: ["TypeScript"],
  certifications: [],
  projects: [],
};
const validJson = JSON.stringify(resume);

// Fake LLM that returns the given responses in order.
const fakeLlm = (...responses: string[]) => {
  let i = 0;
  return vi.fn<GenerateJson>(async () => responses[i++] ?? "");
};

describe("parseResume", () => {
  it("returns the resume when the first response is valid", async () => {
    const llm = fakeLlm(validJson);
    await expect(parseResume("resume text", llm)).resolves.toEqual(resume);
    expect(llm).toHaveBeenCalledTimes(1);
  });

  it("retries once after invalid JSON", async () => {
    const llm = fakeLlm("{oops", validJson);
    await expect(parseResume("resume text", llm)).resolves.toEqual(resume);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it("retries once after JSON with the wrong shape", async () => {
    const llm = fakeLlm('{"foo":1}', validJson);
    await expect(parseResume("resume text", llm)).resolves.toEqual(resume);
  });

  it.each([
    ["invalid JSON", "{oops"],
    ["empty (blocked) responses", ""],
  ])("throws ResumeParseError after two %s", async (_label, response) => {
    const llm = fakeLlm(response, response);
    await expect(parseResume("resume text", llm)).rejects.toBeInstanceOf(ResumeParseError);
    expect(llm).toHaveBeenCalledTimes(2);
  });

  it("does not retry an LlmError", async () => {
    const outage = new LlmError("UNAVAILABLE", "down");
    const llm = vi.fn<GenerateJson>().mockRejectedValue(outage);
    await expect(parseResume("resume text", llm)).rejects.toBe(outage);
    expect(llm).toHaveBeenCalledTimes(1);
  });

  it("sends the text, instructions, and JSON schema to the LLM", async () => {
    const llm = fakeLlm(validJson);
    await parseResume("resume text", llm);
    const request = llm.mock.calls[0]![0];
    expect(request.input).toBe("resume text");
    expect(request.instructions).toContain("Extract only");
    expect(request.jsonSchema).toMatchObject({ type: "object" });
  });
});
