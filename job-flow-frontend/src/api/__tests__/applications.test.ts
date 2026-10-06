import { describe, it, expect, vi } from 'vitest';

vi.mock('../client', () => ({
  default: { patch: vi.fn().mockResolvedValue({ data: {} }) },
}));

import client from '../client';
import { toggleStar } from '../applications';

describe('toggleStar', () => {
  it('hits the star endpoint with a 10s timeout', async () => {
    await toggleStar(42);
    expect(client.patch).toHaveBeenCalledWith('/applications/42/star', null, { timeout: 10_000 });
  });
});
