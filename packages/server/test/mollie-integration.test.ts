import { describe, expect, it } from 'vitest';

import { init as initServer } from '~/api';
import { Customer } from '~/entities';

describe('Server', () => {
  it.todo('/subscription/start', async () => {
    const server = await initServer();

    const customerResponse = await server.inject({
      method: 'POST',
      url: '/customer',
      payload: {
        name: 'John Doe',
        email: 'john@doe.com',
      },
    });

    const customer = new Customer(JSON.parse(customerResponse.body) as Customer);

    const response = await server.inject({
      method: 'POST',
      url: '/subscription/start',
      payload: {
        pricePerUnit: 1,
        units: 50,
        redirectUrl: 'http://my-frontend:3000/test',
        customer: customer._id,
      },
    });

    // eslint-disable-next-line jest/no-standalone-expect
    expect(response.statusCode).toBe(200);
  });
});
