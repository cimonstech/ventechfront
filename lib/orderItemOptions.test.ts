import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatOrderItemOptions } from './orderItemOptions';

describe('formatOrderItemOptions (frontend)', () => {
  it('formats new and old shapes without ids or [object Object]', () => {
    assert.equal(
      formatOrderItemOptions({
        '337799d0-70b6-49b3-8a87-df9e4e660e2a': {
          attribute_name: 'Colour',
          name: 'Black',
          value: 'black',
        },
      }),
      'Colour: Black'
    );
    const old = formatOrderItemOptions({
      '337799d0-70b6-49b3-8a87-df9e4e660e2a': { name: 'Black', value: 'black' },
    });
    assert.equal(old.includes('337799d0'), false);
    assert.equal(old.includes('[object Object]'), false);
    assert.equal(old, 'Black');
  });
});
