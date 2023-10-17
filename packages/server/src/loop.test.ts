import dayjs from 'dayjs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import * as config from '~/config';
import * as databaseExports from '~/database';
import { getFixtures } from '$/fixtures';

import { Customer, Invoice, Payment, Subscription } from './entities';
import { chargeCustomerInvoice, chargeSubscriptions } from './loop';
import { getPaymentProvider } from './payment_providers';
import { getPeriodFromAnchorDate } from './utils';

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

  it('should loop and charge for due subscriptions', async () => {
    // given
    const testData = getFixtures();

    const { customer } = testData;
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
      subscriptions: new Map<string, Subscription>(),
    };

    testData.invoice.items.removeAll();
    db.subscriptions.set(testData.subscription._id, testData.subscription);

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
            } else if (item instanceof Subscription) {
              db.subscriptions.set(item._id, item);
            }
          }

          return Promise.resolve();
        },
        populate() {
          return Promise.resolve();
        },
      },
      subscriptions: {
        find: () => Array.from(db.subscriptions.values()),
      },
      invoices: {
        find: () => Array.from(db.invoices.values()),
      },
    } as unknown as databaseExports.Database);

    const subscription = testData.subscription;
    const nextPayment = dayjs(subscription.nextPayment);
    vi.setSystemTime(nextPayment.add(1, 'day').toDate());

    // when
    await chargeSubscriptions();

    // then
    expect(db.invoices.size).toBe(1);
    const invoice = Array.from(db.invoices.values()).at(0);
    expect(invoice).toBeDefined();
    expect(invoice?.status).toStrictEqual('pending');
    expect(invoice?.items.length).toStrictEqual(3);
    const itemAmounts = [(14 / 31) * 12 * 12.34, (5 / 31) * 15 * 12.34, (12 / 31) * 15 * 5.43];
    expect(invoice?.amount).toStrictEqual(itemAmounts.reduce((sum, amount) => sum + Invoice.roundPrice(amount), 0));

    expect(db.payments.size).toBe(1);
    const payment = Array.from(db.payments.values())[0];
    expect(payment).toBeDefined();
    expect(payment.status).toStrictEqual('pending');
    expect(payment.amount).toStrictEqual(invoice?.totalAmount);

    const updatedSubscription = Array.from(db.subscriptions.values()).at(-1);
    expect(updatedSubscription?.nextPayment).toStrictEqual(
      nextPayment.add(1, 'month').add(1, 'day').endOf('day').toDate(),
    );
  });

  it('should apply customer balance to invoice', async () => {
    // given
    const testData = getFixtures();
    const { invoice, customer } = testData;

    customer.activePaymentMethod = testData.paymentMethod;

    const paymentProvider = getPaymentProvider(testData.project);
    if (!paymentProvider) {
      throw new Error('Payment provider not configured');
    }
    await paymentProvider.createCustomer(customer);

    const persistAndFlush = vi.fn();
    vi.spyOn(databaseExports, 'database', 'get').mockReturnValue({
      em: {
        persistAndFlush,
        populate() {
          return Promise.resolve();
        },
      },
    } as unknown as databaseExports.Database);

    const balance = 123;
    customer.balance = balance;
    const invoiceAmount = invoice.amount;
    const billingPeriod = getPeriodFromAnchorDate(invoice.date, invoice.date);

    // when
    await chargeCustomerInvoice({ billingPeriod, invoice, customer });

    // then
    expect(persistAndFlush).toBeCalledTimes(2);
    const [[updatedInvoice]] = persistAndFlush.mock.calls[1] as [[Invoice]];
    expect(updatedInvoice).toBeDefined();
    expect(updatedInvoice.items.getItems().find((i) => i.description === 'Credit')).toBeDefined();
    expect(updatedInvoice.amount).toStrictEqual(Invoice.roundPrice(invoiceAmount - balance));
    expect(updatedInvoice.totalAmount).toStrictEqual(
      Invoice.roundPrice((invoiceAmount - balance) * (1 + invoice.vatRate / 100)),
    );
  });

  it('should apply customer balance to invoice and keep remaining balance', async () => {
    // given
    const testData = getFixtures();
    const { invoice, customer } = testData;

    customer.activePaymentMethod = testData.paymentMethod;

    const paymentProvider = getPaymentProvider(testData.project);
    if (!paymentProvider) {
      throw new Error('Payment provider not configured');
    }
    await paymentProvider.createCustomer(customer);

    const persistAndFlush = vi.fn();
    vi.spyOn(databaseExports, 'database', 'get').mockReturnValue({
      em: {
        persistAndFlush,
        populate() {
          return Promise.resolve();
        },
      },
    } as unknown as databaseExports.Database);

    const balance = 1000;
    customer.balance = balance;
    const invoiceAmount = invoice.amount;
    const billingPeriod = getPeriodFromAnchorDate(invoice.date, invoice.date);

    // when
    await chargeCustomerInvoice({ billingPeriod, invoice, customer });

    // then
    expect(persistAndFlush).toBeCalledTimes(2);

    const [[updatedCustomer]] = persistAndFlush.mock.calls[0] as [[Customer]];
    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer.balance).toStrictEqual(balance - invoiceAmount);

    const [[updatedInvoice]] = persistAndFlush.mock.calls[1] as [[Invoice]];
    expect(updatedInvoice).toBeDefined();
    expect(updatedInvoice.items.getItems().find((i) => i.description === 'Credit')).toBeDefined();
    expect(updatedInvoice.amount).toStrictEqual(0);
    expect(updatedInvoice.totalAmount).toStrictEqual(0);
  });
});
