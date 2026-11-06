import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SIGNUP_CONFIRM_OTP_TYPE,
  isAlreadyConfirmedError,
  shouldVerifyAuthLinkOnLoad,
} from './authConfirm';

describe('auth confirm', () => {
  it('does not verify on load', () => {
    assert.equal(shouldVerifyAuthLinkOnLoad(), false);
  });

  it('uses email otp type for signup confirmation', () => {
    assert.equal(SIGNUP_CONFIRM_OTP_TYPE, 'email');
  });

  it('detects already-confirmed errors', () => {
    assert.equal(isAlreadyConfirmedError('Email link is invalid or has expired'), false);
    assert.equal(isAlreadyConfirmedError('Email address has already been confirmed'), true);
  });
});
