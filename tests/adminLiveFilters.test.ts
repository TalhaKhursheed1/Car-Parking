import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildAdminLiveQuery, parseAdminLiveFilters } from '../src/features/admin/spaces/filter-utils';

describe('admin live space filter utils', () => {
  it('parses query params into filters', () => {
    const params = new URLSearchParams({
      city: '  Melbourne ',
      status: 'approved',
      provider: 'john@example.com',
      search: 'Docklands',
      page: '3',
    });

    const result = parseAdminLiveFilters(params);
    assert.equal(result.city, 'Melbourne');
    assert.equal(result.status, 'approved');
    assert.equal(result.provider, 'john@example.com');
    assert.equal(result.search, 'Docklands');
    assert.equal(result.page, 3);
  });

  it('builds query strings from filters and omits defaults', () => {
    const query = buildAdminLiveQuery({
      page: 1,
      city: 'Sydney',
      status: 'archived',
      provider: undefined,
      search: 'harbour',
    });

    assert.equal(query, '?city=Sydney&status=archived&search=harbour');
  });

  it('includes page when greater than 1', () => {
    const query = buildAdminLiveQuery({
      page: 4,
      city: undefined,
      status: undefined,
      provider: undefined,
      search: undefined,
    });

    assert.equal(query, '?page=4');
  });
});

