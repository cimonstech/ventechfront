import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { passwordToggleLabel } from './passwordToggle';

describe('PasswordInput toggle labels', () => {
  it('switches aria-label between Show and Hide', () => {
    assert.equal(passwordToggleLabel(false), 'Show password');
    assert.equal(passwordToggleLabel(true), 'Hide password');
  });
});
