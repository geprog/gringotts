import { beforeAll, describe, expect, it, vi } from 'vitest';

import { init as apiInit } from '~/api';
import * as config from '~/config';
import * as database from '~/database';
import { Customer, Payment, PaymentMethod } from '~/entities';
import { getFixtures, mockConfig } from '$/fixtures';

describe('Payment webhook endpoints', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue(mockConfig);

    await database.database.init();
  });

  describe('verification payment', () => {
    it('should verify a payment-method', async () => {
      // given
      const testData = getFixtures();

      const payment = new Payment({
        amount: 1,
        currency: 'EUR',
        customer: testData.customer,
        status: 'processing',
        type: 'verification',
        description: 'Verification payment',
        project: testData.project,
      });

      const persistAndFlush = vi.fn();
      vi.spyOn(database, 'database', 'get').mockReturnValue({
        customers: {
          findOne() {
            return Promise.resolve(null);
          },
        },
        payments: {
          findOne() {
            return Promise.resolve(payment);
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

      const payload = {
        paymentId: payment._id,
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
      };

      const server = await apiInit();

      // before check
      expect(testData.customer.balance).toStrictEqual(0);

      // when
      const response = await server.inject({
        method: 'POST',
        headers: {
          authorization: `Bearer ${testData.project.apiToken}`,
        },
        url: `/api/payment/webhook/${testData.project._id}`,
        payload,
      });

      // then
      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual({ ok: true });

      expect(persistAndFlush).toBeCalledTimes(2);

      const [[updatedPayment]] = persistAndFlush.mock.calls[0] as [[Payment]];
      expect(updatedPayment).toBeDefined();
      expect(updatedPayment.status).toStrictEqual('paid');

      const [[customer, paymentMethod]] = persistAndFlush.mock.calls[1] as [[Customer, PaymentMethod]];
      expect(customer).toBeDefined();
      expect(customer.activePaymentMethod?._id).toStrictEqual(paymentMethod._id);
      expect(customer.balance).toStrictEqual(1);

      expect(paymentMethod).toBeDefined();
      expect(paymentMethod.type).toStrictEqual(paymentMethod.type);
    });

    it.todo('should not verify a payment-method if the payment failed');
  });

  describe('linked to subscription', () => {
    it.todo('should update a subscription');
  });

  describe('linked to invoice', () => {
    it.todo('should update an invoice');

    it.todo('should update an invoice if the payment failed');
  });

  describe.todo('one-off payment');
});
