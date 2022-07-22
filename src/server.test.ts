import { describe, expect, it } from 'vitest';

import { init as initServer } from '~/server';

describe('Server', () => {
  it('/subscription/start', async () => {
    const server = await initServer();

    const response = await server.inject({
      method: 'POST',
      url: '/subscription/start',
      payload: {
        objectId: 'my-object-i-want-to-start-a-subscription-for',
        pricePerUnit: 1,
        units: 50,
        redirectUrl: 'http://my-frontend:3000/test',
        customer: {
          name: 'John Doe',
          // email: 'john@doe.com',
          uff: 'as',
        },
      },
    });

    expect(response.statusCode).toEqual(200);
  });
});
