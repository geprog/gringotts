import { beforeAll, describe, expect, it, MockContext, vi } from 'vitest';

import { init as apiInit } from '~/api';
import * as config from '~/config';
import * as database from '~/database';
import { Customer, Project, Subscription } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';

describe('Subscription endpoints', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue({
      port: 1234,
      adminToken: '',
      postgresUrl: 'postgres://postgres:postgres@localhost:5432/postgres',
      publicUrl: '',
    });

    await database.database.init();
  });

  it('should create a subscription', async () => {
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

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne() {
          return Promise.resolve(customer);
        },
      },
      em: {
        persistAndFlush() {
          return Promise.resolve();
        },
      },
    } as unknown as database.Database);

    const paymentProvider = getPaymentProvider({ paymentProvider: 'mock' } as Project);
    await paymentProvider?.createCustomer(customer);

    const server = await apiInit();

    const subscriptionPayload = {
      pricePerUnit: 15.69,
      units: 123,
      redirectUrl: 'https://example.com',
      customerId: customer._id,
    };

    const response = await server.inject({
      method: 'POST',
      url: '/subscription',
      payload: subscriptionPayload,
    });

    expect(response.statusCode).toBe(200);

    const responseData: { checkoutUrl: string; subscriptionId: string } = response.json();
    expect(responseData).toBeDefined();
    expect(responseData).toHaveProperty('subscriptionId');
    expect(responseData).toHaveProperty('checkoutUrl');
  });

  it('should update a subscription', async () => {
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
      em: {
        persistAndFlush: dbPersistAndFlush,
      },
    } as unknown as database.Database);

    const paymentProvider = getPaymentProvider({ paymentProvider: 'mock' } as Project);
    await paymentProvider?.createCustomer(customer);

    const server = await apiInit();

    const subscriptionPayload = {
      pricePerUnit: 15.69,
      units: 33,
    };

    const response = await server.inject({
      method: 'PATCH',
      url: `/subscription/${subscription._id}`,
      payload: subscriptionPayload,
    });

    expect(response.statusCode).toBe(200);

    const responseData: { ok: boolean } = response.json();
    expect(responseData).toBeDefined();
    expect(responseData).toEqual({ ok: true });

    expect(dbPersistAndFlush).toHaveBeenCalledTimes(1);
    const [_subscription] = (dbPersistAndFlush.mock as MockContext<[Subscription], unknown>).calls[0];
    expect(_subscription.changes).toHaveLength(2);
    expect(_subscription.changes[1]).toContain(subscriptionPayload);
  });
});
