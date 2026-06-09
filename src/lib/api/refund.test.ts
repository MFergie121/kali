import { describe, expect, it } from "vitest";
import { isRefundable } from "./refund";

describe("isRefundable", () => {
  it("does not refund success", () => {
    expect(isRefundable(200)).toBe(false);
  });

  it("does not refund client errors the consumer is responsible for", () => {
    expect(isRefundable(400)).toBe(false);
    expect(isRefundable(429)).toBe(false);
  });

  it("refunds server errors", () => {
    expect(isRefundable(500)).toBe(true);
    expect(isRefundable(503)).toBe(true);
  });
});
