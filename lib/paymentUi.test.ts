import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PAYMENT_START_TIMEOUT_MS,
  paymentStartTimedOut,
  shouldResetPaymentUiOnPageShow,
} from './paymentUi';

describe('payment UI reset', () => {
  it('resets on BFCache pageshow only', () => {
    assert.equal(shouldResetPaymentUiOnPageShow(true), true);
    assert.equal(shouldResetPaymentUiOnPageShow(false), false);
  });

  it('times out starting payment after 30 seconds', () => {
    const start = 1_000_000;
    assert.equal(paymentStartTimedOut(start, start + PAYMENT_START_TIMEOUT_MS - 1), false);
    assert.equal(paymentStartTimedOut(start, start + PAYMENT_START_TIMEOUT_MS), true);
  });
});
