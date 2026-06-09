import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, keyPrefix } from "./key-crypto";

describe("hashApiKey", () => {
  it("is deterministic for the same input", () => {
    expect(hashApiKey("abc123")).toBe(hashApiKey("abc123"));
  });

  it("returns 64-char hex", () => {
    expect(hashApiKey("abc123")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("maps distinct inputs to distinct hashes", () => {
    expect(hashApiKey("abc123")).not.toBe(hashApiKey("abc124"));
  });
});

describe("keyPrefix", () => {
  it("returns the first 8 characters", () => {
    expect(keyPrefix("0123456789abcdef")).toBe("01234567");
  });
});

describe("generateApiKey", () => {
  it("returns a 64-char hex token", () => {
    expect(generateApiKey()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("does not collide across calls", () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateApiKey()));
    expect(keys.size).toBe(100);
  });
});
