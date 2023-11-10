import { beforeAll, describe, expect, it, vi } from 'vitest';

import { init as apiInit } from '~/api';
import * as config from '~/config';
import * as database from '~/database';
import { Customer, PaymentMethod, Project } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';
import { getFixtures, mockConfig } from '$/fixtures';

describe('Payment-method endpoints', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue(mockConfig);

    await database.database.init();
  });

  it('should create a payment-method', async () => {
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

    const persistAndFlush = vi.fn();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      customers: {
        findOne() {
          return Promise.resolve(customer);
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
    await paymentProvider?.createCustomer(customer);

    const server = await apiInit();

    const paymentMethodPayload = {
      redirectUrl: 'https://example.com',
      customerId: customer._id,
    };

    // when
    const response = await server.inject({
      method: 'POST',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/api/customer/${customer._id}/payment-method`,
      payload: paymentMethodPayload,
    });

    // then
    expect(response.statusCode).toBe(200);

    const { checkoutUrl }: { checkoutUrl?: string } = response.json();
    expect(checkoutUrl).toBeDefined();

    expect(persistAndFlush).toHaveBeenCalled();
    const [[paymentMethod]] = persistAndFlush.mock.lastCall as [[PaymentMethod]];
    expect(paymentMethod).toContain({
      description: 'Payment method verification',
      type: 'verification',
    });
  });

  it('should get a payment-method of a customer by its id', async () => {
    // given
    const testData = getFixtures();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      paymentMethods: {
        findOne() {
          return Promise.resolve(testData.paymentMethod);
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
      url: `/api/customer/${testData.customer._id}/payment-method/${testData.paymentMethod._id}}`,
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
    });

    // then
    expect(response.statusCode).toBe(200);

    const paymentMethod: PaymentMethod = response.json();
    expect(paymentMethod).toBeDefined();
    expect(paymentMethod._id).toStrictEqual(testData.paymentMethod._id);
    expect(paymentMethod.name).toStrictEqual(testData.paymentMethod.name);
  });

  it('should get all payment-methods of a customer', async () => {
    // given
    const testData = getFixtures();

    const paymentMethod2 = <PaymentMethod>{
      _id: '123',
      customer: testData.customer,
      paymentProviderId: '123',
      type: 'credit-card',
      name: 'John Doe',
    };

    testData.customer.paymentMethods.add([new PaymentMethod(paymentMethod2)]);

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
    const response = await server.inject({
      method: 'GET',
      url: `/api/customer/${testData.customer._id}/payment-method`,
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
    });

    // then
    expect(response.statusCode).toBe(200);

    const paymentMethods: PaymentMethod[] = response.json();
    expect(paymentMethods).toBeDefined();
    expect(paymentMethods).toHaveLength(2);
    expect(paymentMethods[0]._id).toEqual(testData.paymentMethod._id);
    expect(paymentMethods[1]._id).toEqual(paymentMethod2._id);
  });

  it('should delete a payment-method', async () => {
    // given
    const testData = getFixtures();

    const paymentMethodData = <PaymentMethod>{
      _id: '123',
      type: 'credit-card',
      name: 'VISA',
      customer: testData.customer,
      paymentProviderId: '123',
    };

    const persistAndFlush = vi.fn();
    const removeAndFlush = vi.fn();

    vi.spyOn(database, 'database', 'get').mockReturnValue({
      paymentMethods: {
        findOne() {
          return Promise.resolve(new PaymentMethod({ ...paymentMethodData, customer: testData.customer }));
        },
      },
      projects: {
        findOne() {
          return Promise.resolve(testData.project);
        },
      },
      em: {
        persistAndFlush,
        removeAndFlush,
      },
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${testData.project.apiToken}`,
      },
      url: `/api/customer/${testData.customer._id}/payment-method/${paymentMethodData._id}`,
    });

    // then
    expect(response.statusCode).toBe(200);

    const paymentMethodResponse: { ok: boolean } = response.json();
    expect(paymentMethodResponse).toBeDefined();
    expect(paymentMethodResponse).toStrictEqual({ ok: true });
    expect(removeAndFlush).toBeCalledTimes(1);
    expect(removeAndFlush).toHaveBeenCalledWith(paymentMethodData);

    expect(persistAndFlush).toBeCalledTimes(1);
  });
});
