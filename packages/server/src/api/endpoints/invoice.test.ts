import fastifyView from '@fastify/view';
import dayjs from 'dayjs';
import fastify from 'fastify';
import Handlebars from 'handlebars';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { addSchemas } from '~/api/schema';
import * as config from '~/config';
import * as database from '~/database';
import { Customer, Invoice, Subscription } from '~/entities';
import { Currency } from '~/entities/payment';
import { formatDate } from '~/lib/dayjs';
import { getPeriodFromAnchorDate } from '~/utils';

import { invoiceEndpoints } from './invoice';

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
      paymentProvider: 'mocked',
      port: 1234,
      mollieApiKey: '',
      jwtSecret: '',
      postgresUrl: 'postgres://postgres:postgres@localhost:5432/postgres',
      publicUrl: '',
      webhookUrl: '',
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

    const server = fastify({
      logger: {
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
    });
    invoiceEndpoints(server);
    addSchemas(server);

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

    const server = fastify();
    invoiceEndpoints(server);
    addSchemas(server);

    Handlebars.registerHelper('formatDate', (date: Date, format: string) => formatDate(date, format));
    Handlebars.registerHelper('amountToPrice', (amount: number, currency: Currency) =>
      Invoice.amountToPrice(amount, currency),
    );

    await server.register(fastifyView, {
      engine: {
        handlebars: Handlebars,
      },
    });

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
