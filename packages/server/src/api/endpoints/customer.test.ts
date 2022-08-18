import fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { addSchemas } from '~/api/schema';
import * as database from '~/database';
import { Customer } from '~/entities';

import { customerEndpoints } from './customer';

describe('Customer endpoints', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a customer', async () => {
    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne(where) {
          return null;
        },
      },
    });

    const server = fastify();
    customerEndpoints(server);
    addSchemas(server);

    const customerData = <Customer>{
      name: 'John Doe',
      email: 'john@doe.com',
      addressLine1: 'BigBen Street 954',
      addressLine2: '123',
      city: 'London',
      country: 'GB',
      zipCode: 'ENG-1234',
    };

    const customerResponse = await server.inject({
      method: 'POST',
      url: '/customer',
      payload: customerData,
    });

    expect(customerResponse.statusCode).toBe(200);

    expect(customerResponse.json).toBeDefined();
    const customer = customerResponse.json as unknown as Customer;
    expect(customer).toContain(customerData);
  });
});
