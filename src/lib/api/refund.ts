// Pure predicate encoding the quota refund policy. A request is refunded only
// when the failure is the server's responsibility (5xx); the consumer's own
// mistakes (400) still draw down quota. See refund.test.ts.

/** True when a response status should be refunded to the consumer's quota. */
export function isRefundable(status: number): boolean {
  return status >= 500;
}
