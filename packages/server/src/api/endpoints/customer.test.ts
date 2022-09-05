import fastify from 'fastify';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { addSchemas } from '~/api/schema';
import * as config from '~/config';
import * as database from '~/database';
import { Customer } from '~/entities';

import { customerEndpoints } from './customer';

describe('Customer endpoints', () => {
  beforeAll(() => {
    vi.spyOn(config, 'config', 'get').mockReturnValue({
      port: 1234,
      jwtSecret: '',
      postgresUrl: '',
      publicUrl: '',
    });
  });

  it('should create a customer', async () => {
    const server = fastify();
    customerEndpoints(server);
    addSchemas(server);

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

    const customerData = <Customer>{
      name: 'John Doe',
      email: 'john@doe.com',
      addressLine1: 'BigBen Street 954',
      addressLine2: '123',
      city: 'London',
      country: 'GB',
      zipCode: 'ENG-1234',
    };

    const response = await server.inject({
      method: 'POST',
      url: '/customer',
      payload: customerData,
    });

    expect(response.statusCode).toBe(200);

    const customer: Customer = response.json();
    expect(customer).toBeDefined();
    expect(customer).toContain(customerData);
  });

  it('should find a customer by its email', async () => {
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

    vi.spyOn(database, 'database', 'get').mockReturnValue({
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

  it('should update a customer', async () => {
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

    const updateMock = vi.fn().mockResolvedValue(true);

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne() {
          return Promise.resolve(customerData);
        },
      },
      em: {
        persistAndFlush: updateMock,
      },
    } as unknown as database.Database);

    const response = await server.inject({
      method: 'PATCH',
      url: `/customer/${customerData._id}`,
      payload: customerData,
    });

    expect(response.statusCode).toBe(200);

    const customer: Customer = response.json();
    expect(customer).toBeDefined();
    expect(customer).toContain(customerData);
    expect(updateMock).toBeCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(customerData);
  });

  it('should delete a customer', async () => {
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

    const deleteMock = vi.fn();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne() {
          return Promise.resolve(customerData);
        },
      },
      em: {
        removeAndFlush: deleteMock,
      },
    } as unknown as database.Database);

    const response = await server.inject({
      method: 'DELETE',
      url: `/customer/${customerData._id}`,
    });

    expect(response.statusCode).toBe(200);

    const customer: Customer = response.json();
    expect(customer).toBeDefined();
    expect(customer).toStrictEqual({ ok: true });
    expect(deleteMock).toBeCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(customerData);
  });
});
