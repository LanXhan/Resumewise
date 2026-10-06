import { ApiError, GoogleGenAI } from "@google/genai";

// Provider-neutral contract: callers (e.g. parseResume) depend on this type only,
// so tests can pass a fake and another provider could replace Gemini later.
export interface GenerateJsonRequest {
  instructions: string; // system instruction: how to behave
  input: string; // user content: the data to work on
  jsonSchema: object; // shape the response must follow
}

export type GenerateJson = (request: GenerateJsonRequest) => Promise<string>;

export type LlmErrorCode = "RATE_LIMITED" | "UNAVAILABLE";

export class LlmError extends Error {
  constructor(
    public readonly code: LlmErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "LlmError";
  }
}

const TIMEOUT_MS = 30_000;

// 429 and outages become LlmError so callers can answer 503. Other 4xx (bad key,
// rejected schema) are our own bugs, so they are rethrown unchanged and surface as 500s.
export function toLlmError(err: unknown): unknown {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return new LlmError("RATE_LIMITED", "LLM provider rate limit reached.", { cause: err });
    }
    if (err.status >= 500) {
      return new LlmError("UNAVAILABLE", "LLM provider is unavailable.", { cause: err });
    }
    return err;
  }
  // Not an HTTP response at all: timeout (AbortError) or network failure.
  return new LlmError("UNAVAILABLE", "LLM provider could not be reached.", { cause: err });
}

export function createGeminiGenerateJson({
  apiKey,
  model,
}: {
  apiKey: string;
  model: string;
}): GenerateJson {
  // The SDK does not retry unless retryOptions is set; retries are parseResume's decision.
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: TIMEOUT_MS } });

  return async ({ instructions, input, jsonSchema }) => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: input,
        config: {
          systemInstruction: instructions,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          temperature: 0,
        },
      });
      // `text` is undefined when the model returns nothing (e.g. a blocked response).
      // An empty string then fails JSON parsing in the caller, like any bad output.
      return response.text ?? "";
    } catch (err) {
      throw toLlmError(err);
    }
  };
}
