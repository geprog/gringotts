import { describe, expect, it } from 'vitest';

import { init as initServer } from '~/server';

describe('Server', () => {
  it('/subscription/start', async () => {
    const server = initServer();

    const response = await server.inject({
      method: 'POST',
      url: '/subscription/start',
    });

    expect(response.statusCode).toEqual(200);
  });
});
