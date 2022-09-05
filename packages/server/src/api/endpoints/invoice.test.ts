import dayjs from 'dayjs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { init as apiInit } from '~/api';
import * as config from '~/config';
import * as database from '~/database';
import { Customer, Invoice, Subscription } from '~/entities';
import { getPeriodFromAnchorDate } from '~/utils';

function getTestData() {
  const customer = new Customer({
    addressLine1: 'BigBen Street 954',
    addressLine2: '123',
    city: 'London',
    country: 'GB',
    email: 'john@doe.co.uk',
    name: 'John Doe',
    zipCode: 'ENG-1234',
    paymentProviderId: '123',
    invoicePrefix: 'INV-F1B-0B6H',
  });

  const subscription = new Subscription({
    anchorDate: dayjs('2020-01-01').toDate(),
    customer,
  });
  subscription.changePlan({ pricePerUnit: 12.34, units: 12 });
  subscription.changePlan({ pricePerUnit: 12.34, units: 15, changeDate: dayjs('2020-01-15').toDate() });
  subscription.changePlan({ pricePerUnit: 5.43, units: 15, changeDate: dayjs('2020-01-20').toDate() });

  const { start, end } = getPeriodFromAnchorDate(dayjs('2020-01-15').toDate(), subscription.anchorDate);
  const period = subscription.getPeriod(start, end);

  const invoice = new Invoice({
    _id: '123',
    vatRate: 19.0,
    currency: 'EUR',
    end,
    start,
    sequentialId: 2,
    status: 'paid',
    subscription,
  });

  period.getInvoiceItems().forEach((item) => {
    invoice.items.add(item);
  });

  return { customer, subscription, invoice };
}

describe('Invoice endpoints', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue({
      port: 1234,
      adminToken: '',
      postgresUrl: 'postgres://postgres:postgres@localhost:5432/postgres',
      publicUrl: '',
    });

    await database.database.init();
  });

  it('should get an invoice', async () => {
    // given
    const testData = getTestData();

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
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'GET',
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
    const testData = getTestData();

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
    } as unknown as database.Database);

    const server = await apiInit();

    // when
    const response = await server.inject({
      method: 'GET',
      url: `/invoice/${testData.invoice._id}/html`,
    });

    // then
    expect(response.statusCode).toBe(200);

    const responseData = response.body;
    expect(responseData).toMatchSnapshot();
  });
});
