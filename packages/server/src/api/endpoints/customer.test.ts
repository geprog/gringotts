import { beforeAll, describe, expect, it, vi } from 'vitest';

import { getFixtures } from '~/../test/fixtures';
import { init as apiInit } from '~/api';
import * as config from '~/config';
import * as database from '~/database';
import { Customer } from '~/entities';

describe('Customer endpoints', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue({
      port: 1234,
      adminToken: '',
      postgresUrl: 'postgres://postgres:postgres@localhost:5432/postgres',
      publicUrl: '',
      dataPath: '',
      gotenbergUrl: '',
      jwtSecret: '',
    });

    await database.database.init();
  });

  it('should create a customer', async () => {
    // given
    const testData = getFixtures();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne() {
          return Promise.resolve(null);
        },
      },
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
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

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'POST',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: '/api/customer',
      payload: customerData,
    });

    // then
    expect(response.statusCode).toBe(200);

    const customer: Customer = response.json();
    expect(customer).toBeDefined();
    expect(customer).toContain(customerData);
  });

  it('should find a customer by its email', async () => {
    // given
    const testData = getFixtures();

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
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const customersResponse = await server.inject({
      method: 'GET',
      url: `/api/customer`,
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      query: {
        email: customerData.email,
      },
    });

    // then
    expect(customersResponse.statusCode).toBe(200);

    const customers: Customer[] = customersResponse.json();
    expect(customers).toBeDefined();
    expect(customers).toHaveLength(1);
    expect(customers[0]).toContain(customerData);
  });

  it('should get all customers', async () => {
    // given
    const testData = getFixtures();

    const customer2 = <Customer>{
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
          return Promise.resolve([testData.customer, customer2]);
        },
      },
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const customersResponse = await server.inject({
      method: 'GET',
      url: `/api/customer`,
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
    });

    // then
    expect(customersResponse.statusCode).toBe(200);

    const customers: Customer[] = customersResponse.json();
    expect(customers).toBeDefined();
    expect(customers).toHaveLength(2);
    expect(customers[0]._id).toEqual(testData.customer._id);
    expect(customers[1]._id).toEqual(customer2._id);
  });

  it('should get a customer by its id', async () => {
    // given
    const testData = getFixtures();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne() {
          return Promise.resolve(testData.customer);
        },
      },
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const customerResponse = await server.inject({
      method: 'GET',
      url: `/api/customer/${testData.customer._id}`,
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
    });

    // then
    expect(customerResponse.statusCode).toBe(200);

    const customer: Customer = customerResponse.json();
    expect(customer._id).toContain(testData.customer._id);
  });

  it('should update a customer', async () => {
    // given
    const testData = getFixtures();

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
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
      em: {
        persistAndFlush: updateMock,
      },
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/api/customer/${customerData._id}`,
      payload: customerData,
    });

    // then
    expect(response.statusCode).toBe(200);

    const customer: Customer = response.json();
    expect(customer).toBeDefined();
    expect(customer).toContain(customerData);
    expect(updateMock).toBeCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith(customerData);
  });

  it('should delete a customer', async () => {
    // given
    const testData = getFixtures();

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
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
      em: {
        removeAndFlush: deleteMock,
      },
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/api/customer/${customerData._id}`,
    });

    // then
    expect(response.statusCode).toBe(200);

    const customer: Customer = response.json();
    expect(customer).toBeDefined();
    expect(customer).toStrictEqual({ ok: true });
    expect(deleteMock).toBeCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(customerData);
  });
});
