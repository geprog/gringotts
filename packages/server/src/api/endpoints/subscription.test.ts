import dayjs from 'dayjs';
import { beforeAll, describe, expect, it, MockContext, vi } from 'vitest';

import { init as apiInit } from '~/api';
import * as config from '~/config';
import * as database from '~/database';
import { Customer, Invoice, Project, Subscription } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';
import { getFixtures, mockConfig } from '$/fixtures';

describe('Subscription endpoints', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue(mockConfig);

    await database.database.init();
  });

  it('should create a subscription', async () => {
    // given
    const testData = getFixtures();

    const persistAndFlush = vi.fn();
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
      em: {
        persistAndFlush,
      },
    } as unknown as database.Database);

    const paymentProvider = getPaymentProvider({ paymentProvider: 'mocked' } as Project);
    await paymentProvider?.createCustomer(testData.customer);

    const server = await apiInit();

    const subscriptionPayload = {
      pricePerUnit: 15.69,
      units: 123,
      redirectUrl: 'https://example.com',
      customerId: testData.customer._id,
    };

    const date = new Date('2021-01-01');
    vi.setSystemTime(date);

    // when
    const response = await server.inject({
      method: 'POST',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: '/api/subscription',
      payload: subscriptionPayload,
    });

    // then
    expect(response.statusCode).toBe(200);

    const responseData: Subscription = response.json();
    expect(responseData).toBeDefined();

    expect(persistAndFlush).toHaveBeenCalledTimes(1);
    const [[, subscription]] = persistAndFlush.mock.lastCall as [[Customer, Subscription]];
    expect(responseData._id).toStrictEqual(subscription._id);
    expect(dayjs(responseData.currentPeriodStart).toDate()).toStrictEqual(date);
    expect(dayjs(responseData.currentPeriodEnd).toDate()).toStrictEqual(
      // set ms to 0 because db does not store ms
      dayjs(date).add(1, 'month').subtract(1, 'day').endOf('day').set('millisecond', 0).toDate(),
    );
  });

  it('should update a subscription', async () => {
    // given
    const testData = getFixtures();

    const customer = <Customer>{
      _id: '123',
      name: 'John Doe',
      email: 'john@doe.com',
      addressLine1: 'BigBen Street 954',
      addressLine2: '123',
      city: 'London',
      country: 'GB',
      zipCode: 'ENG-1234',
    };

    const subscription = new Subscription({
      _id: 'sub-123',
      customer,
      anchorDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    subscription.changePlan({ units: 123, pricePerUnit: 15.69 });

    const dbPersistAndFlush = vi.fn();
    vi.spyOn(database, 'database', 'get').mockReturnValue({
      subscriptions: {
        findOne() {
          return Promise.resolve(subscription);
        },
      },
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
      em: {
        persistAndFlush: dbPersistAndFlush,
      },
    } as unknown as database.Database);

    const paymentProvider = getPaymentProvider({ paymentProvider: 'mocked' } as Project);
    await paymentProvider?.createCustomer(customer);

    const subscriptionPayload = {
      pricePerUnit: 15.69,
      units: 33,
    };

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/api/subscription/${subscription._id}`,
      payload: subscriptionPayload,
    });

    // then
    expect(response.statusCode).toBe(200);

    const responseData: { ok: boolean } = response.json();
    expect(responseData).toBeDefined();
    expect(responseData).toEqual({ ok: true });

    expect(dbPersistAndFlush).toHaveBeenCalledTimes(1);
    const [_subscription] = (dbPersistAndFlush.mock as MockContext<[Subscription], unknown>).calls[0];
    expect(_subscription.changes).toHaveLength(2);
    expect(_subscription.changes[1]).toContain(subscriptionPayload);
  });

  it('should get all invoices of a subscription', async () => {
    // given
    const testData = getFixtures();

    const dbPersistAndFlush = vi.fn();
    vi.spyOn(database, 'database', 'get').mockReturnValue({
      subscriptions: {
        findOne() {
          return Promise.resolve(testData.subscription);
        },
      },
      invoices: {
        find() {
          return Promise.resolve([testData.invoice]);
        },
      },
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
      em: {
        persistAndFlush: dbPersistAndFlush,
      },
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'GET',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/api/subscription/${testData.subscription._id}/invoice`,
    });

    // then
    expect(response.statusCode).toBe(200);

    const invoices: Invoice[] = response.json();
    expect(invoices).toHaveLength(1);
  });
});
