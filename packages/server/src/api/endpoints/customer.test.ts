import fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addSchemas } from '~/api/schema';
import * as config from '~/config';
import * as database from '~/database';
import { Customer } from '~/entities';

import { customerEndpoints } from './customer';

describe('Customer endpoints', () => {
  beforeEach(() => {
    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne() {
          return Promise.resolve(null);
        },
      },
      em: {
        persistAndFlush() {
          return Promise.resolve();
        },
      },
    } as unknown as database.Database);

    vi.spyOn(config, 'config', 'get').mockReturnValue({
      paymentProvider: 'mocked',
      port: 1234,
      mollieApiKey: '',
      jwtSecret: '',
      postgresUrl: '',
      publicUrl: '',
      webhookUrl: '',
    });
  });

  it('should create a customer', async () => {
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

    const customer: Customer = customerResponse.json();
    expect(customer).toBeDefined();
    expect(customer).toContain(customerData);
  });

  it('should return a customer by its id', async () => {
    const server = fastify();
    customerEndpoints(server);
    addSchemas(server);

    const customerData = <Customer>{
      _id: '123',
      name: 'John Doe',
      email: 'john@doe.com',
      addressLine1: 'BigBen Street 954',
      addressLine2: '123',
      city: 'London',
      country: 'GB',
      zipCode: 'ENG-1234',
    };

    vi.spyOn(database, 'database', 'get').mockReturnValueOnce({
      customers: {
        find() {
          return Promise.resolve([customerData]);
        },
      },
    } as unknown as database.Database);

    const customersResponse = await server.inject({
      method: 'GET',
      url: `/customer`,
      query: {
        email: customerData.email,
      },
      payload: customerData,
    });

    expect(customersResponse.statusCode).toBe(200);

    const customers: Customer[] = customersResponse.json();
    expect(customers).toBeDefined();
    expect(customers).toHaveLength(1);
    expect(customers[0]).toContain(customerData);
  });
});
