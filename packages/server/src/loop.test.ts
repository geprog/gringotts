import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as config from '~/config';
import * as databaseExports from '~/database';
import { getFixtures } from '$/fixtures';

import { Customer, Invoice, Payment } from './entities';
import { chargeInvoices } from './loop';
import { getPaymentProvider } from './payment_providers';

describe('Loop', () => {
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

    await databaseExports.database.init();
  });

  beforeEach(() => {
    // tell vitest we use mocked time
    vi.useFakeTimers();
  });

  afterEach(() => {
    // restoring date after each test run
    vi.useRealTimers();
  });

  it.only('should loop and charge for open invoices', async () => {
    // given
    const testData = getFixtures();

    const customer = testData.customer;
    customer.activePaymentMethod = testData.paymentMethod;

    const paymentProvider = getPaymentProvider(testData.project);
    if (!paymentProvider) {
      throw new Error('Payment provider not configured');
    }
    await paymentProvider.createCustomer(customer);

    const db = {
      invoices: new Map<string, Invoice>(),
      payments: new Map<string, Payment>(),
      customers: new Map<string, Customer>(),
    };

    db.invoices.set(testData.invoice._id, testData.invoice);

    vi.spyOn(databaseExports, 'database', 'get').mockReturnValue({
      em: {
        persistAndFlush: async (_items: unknown[] | unknown) => {
          const items = Array.isArray(_items) ? _items : [_items];

          for (const item of items) {
            // console.log('set', item._id, item.constructor.name);
            if (item instanceof Invoice) {
              db.invoices.set(item._id, item);
            } else if (item instanceof Payment) {
              db.payments.set(item._id, item);
            } else if (item instanceof Customer) {
              db.customers.set(item._id, item);
            }
          }

          return Promise.resolve();
        },
        populate() {
          return Promise.resolve();
        },
      },
      invoices: {
        find() {
          return Promise.resolve(Array.from(db.invoices.values()));
        },
      },
    } as unknown as databaseExports.Database);

    const date = new Date('2020-02-02');
    vi.setSystemTime(date);

    // before when
    let oldInvoice = db.invoices.get(testData.invoice._id);
    expect(oldInvoice?.status).toBe('draft');
    expect(oldInvoice?.items.length).toBe(0);

    // when
    await chargeInvoices();

    // const o = Array.from(db.invoices.values());

    // const r = (_i: Record<string, unknown>) => {
    //   const i = typeof _i?.toJSON === 'function' ? _i.toJSON() : _i;
    //   return Object.entries(i).reduce((acc, [k, v]) => {
    //     if (typeof v === 'object' && (v as { _id?: string })?._id) {
    //       return {
    //         ...acc,
    //         [k]: { _id: (v as { _id: string })._id },
    //       };
    //     }

    //     if (Array.isArray(v)) {
    //       return {
    //         ...acc,
    //         [k]: v.map(r),
    //       };
    //     }

    //     return {
    //       ...acc,
    //       [k]: v,
    //     };
    //   }, {});
    // };

    // console.log(o.map(r));

    // then
    oldInvoice = db.invoices.get(testData.invoice._id);
    expect(oldInvoice).toBeDefined();
    expect(oldInvoice?.status).toStrictEqual('pending');
    // expect(oldInvoice?.date).toStrictEqual(new Date('2020-02-28')); // TODO: check invoice date
    expect(oldInvoice?.items.length).toStrictEqual(3);
    expect(oldInvoice?.totalAmount).toStrictEqual(150.07);

    expect(db.payments.size).toBe(1);
    const payment = Array.from(db.payments.values())[0];
    expect(payment).toBeDefined();
    expect(payment.status).toStrictEqual('pending');
    expect(payment.amount).toStrictEqual(150.07);

    expect(db.invoices.size).toBe(2);
    let newInvoice = Array.from(db.invoices.values()).at(-1);
    expect(newInvoice).toBeDefined();
    expect(newInvoice?.status).toStrictEqual('draft');

    // next period
    newInvoice?.subscription.changePlan({ pricePerUnit: 13, units: 2, changeDate: new Date('2020-02-09') });
    newInvoice?.subscription.changePlan({ pricePerUnit: 40, units: 4, changeDate: new Date('2020-02-24') });
    vi.setSystemTime(new Date('2020-03-02'));
    await chargeInvoices();

    newInvoice = Array.from(db.invoices.values()).at(-1);
    expect(newInvoice).toBeDefined();
    // expect(newInvoice?.date).toStrictEqual(new Date('2020-03-31')); // TODO: check invoice date
    expect(newInvoice?.status).toStrictEqual('pending');
    expect(newInvoice?.items.length).toStrictEqual(1);
  });

  // it('Should apply customer balance to invoice', async () => {});

  // it('Should apply customer balance to invoice and add negative rest amount to balance again', async () => {});
});
