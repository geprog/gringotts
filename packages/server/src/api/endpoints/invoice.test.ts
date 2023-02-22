import { beforeAll, describe, expect, it, vi } from 'vitest';

import { getFixtures } from '~/../test/fixtures';
import { init as apiInit } from '~/api';
import * as config from '~/config';
import * as database from '~/database';
import { Invoice } from '~/entities';

describe('Invoice endpoints', () => {
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

  it('should get an invoice', async () => {
    // given
    const testData = getFixtures();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      invoices: {
        findOne() {
          return Promise.resolve(testData.invoice);
        },
      },
      customers: {
        findOne() {
          return Promise.resolve(testData.customer);
        },
      },
      subscriptions: {
        findOne() {
          return Promise.resolve(testData.subscription);
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
    const response = await server.inject({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/invoice/${testData.invoice._id}`,
    });

    // then
    expect(response.statusCode).toBe(200);

    const responseData: Invoice = response.json();
    expect(responseData._id).toBe(testData.invoice._id);
    expect(responseData.amount).toBe(128.25);
  });

  it('should get an html invoice', async () => {
    // given
    const testData = getFixtures();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      invoices: {
        findOne() {
          return Promise.resolve(testData.invoice);
        },
      },
      customers: {
        findOne() {
          return Promise.resolve(testData.customer);
        },
      },
      subscriptions: {
        findOne() {
          return Promise.resolve(testData.subscription);
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
    const response = await server.inject({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/invoice/${testData.invoice._id}/html`,
    });

    // then
    expect(response.statusCode).toBe(200);

    const responseData = response.body;
    expect(responseData).toMatchSnapshot();
  });
});
