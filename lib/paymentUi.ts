/** BFCache restore (browser Back) must reset the Pay now button. */
export function shouldResetPaymentUiOnPageShow(persisted: boolean): boolean {
  return persisted === true;
}

export const PAYMENT_START_TIMEOUT_MS = 30_000;

export function paymentStartTimedOut(startedAtMs: number, nowMs: number): boolean {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) return false;
  return nowMs - startedAtMs >= PAYMENT_START_TIMEOUT_MS;
}
