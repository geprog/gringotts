import dayjs from 'dayjs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import * as config from '~/config';
import * as databaseExports from '~/database';
import { getFixtures, mockConfig } from '$/fixtures';

import { Customer, Invoice, Payment, Subscription } from './entities';
import { chargeCustomerInvoice, chargePendingInvoices, chargeSubscriptions } from './loop';
import { getPaymentProvider } from './payment_providers';

describe('Loop', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue(mockConfig);

    await databaseExports.database.init();
  });

  it('should loop and create invoices for due subscriptions', async () => {
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
    const currentPeriodEnd = dayjs(subscription.currentPeriodEnd);
    vi.setSystemTime(currentPeriodEnd.add(1, 'day').toDate());

    // when
    await chargeSubscriptions();

    // then
    expect(db.invoices.size).toBe(1);
    const invoice = Array.from(db.invoices.values()).at(0);
    expect(invoice).toBeDefined();
    expect(invoice?.items.length).toStrictEqual(3);
    expect(invoice?.status).toStrictEqual('pending');
    const itemAmounts = [(14 / 31) * 12 * 12.34, (5 / 31) * 15 * 12.34, (12 / 31) * 15 * 5.43];
    expect(invoice?.amount).toStrictEqual(itemAmounts.reduce((sum, amount) => sum + Invoice.roundPrice(amount), 0));

    const updatedSubscription = Array.from(db.subscriptions.values()).at(-1);
    expect(updatedSubscription?.currentPeriodStart).toStrictEqual(
      currentPeriodEnd.add(1, 'day').startOf('day').toDate(),
    );
    expect(updatedSubscription?.currentPeriodEnd).toStrictEqual(currentPeriodEnd.add(1, 'month').endOf('day').toDate());
  });

  it('should loop and charge pending invoices', async () => {
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

    // when
    await chargePendingInvoices();

    // then
    expect(db.payments.size).toBe(1);
    const payment = Array.from(db.payments.values())[0];

    expect(db.invoices.size).toBe(1);
    const invoice = Array.from(db.invoices.values()).at(0);

    expect(payment).toBeDefined();
    expect(payment.status).toStrictEqual('processing');
    expect(payment.amount).toStrictEqual(invoice?.totalAmount);

    expect(invoice).toBeDefined();
    expect(invoice?.status).toStrictEqual('processing');
  });

  it('should apply customer balance when charing', async () => {
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

    // when
    await chargeCustomerInvoice(invoice);

    // then
    expect(persistAndFlush).toBeCalledTimes(2);
    const [[updatedInvoice, payment]] = persistAndFlush.mock.calls[1] as [[Invoice, Payment]];
    expect(updatedInvoice).toBeDefined();
    expect(updatedInvoice.items.getItems().find((i) => i.description === 'Credit')).toBeDefined();
    expect(updatedInvoice.amount).toStrictEqual(Invoice.roundPrice(invoiceAmount - balance));
    expect(updatedInvoice.totalAmount).toStrictEqual(
      Invoice.roundPrice((invoiceAmount - balance) * (1 + invoice.vatRate / 100)),
    );

    expect(payment).toBeDefined();
    expect(payment.amount).toStrictEqual(updatedInvoice.totalAmount);
    expect(payment.status).toStrictEqual('processing');
  });

  it('should apply customer balance when charging and keep remaining balance', async () => {
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

    const now = dayjs('2021-01-01').toDate();
    vi.setSystemTime(now);

    // when
    await chargeCustomerInvoice(invoice);

    // then
    expect(persistAndFlush).toBeCalledTimes(3);

    const [[updatedCustomer]] = persistAndFlush.mock.calls[0] as [[Customer]];
    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer.balance).toStrictEqual(balance - invoiceAmount);

    const [[updatedSubscription]] = persistAndFlush.mock.calls[1] as [[Subscription]];
    expect(updatedSubscription).toBeDefined();
    expect(updatedSubscription.lastPayment).toStrictEqual(now);

    const [[updatedInvoice, payment]] = persistAndFlush.mock.calls[2] as [[Invoice, Payment]];
    expect(updatedInvoice).toBeDefined();
    expect(updatedInvoice.items.getItems().find((i) => i.description === 'Credit')).toBeDefined();
    expect(updatedInvoice.amount).toStrictEqual(0);
    expect(updatedInvoice.totalAmount).toStrictEqual(0);
    expect(updatedInvoice.status).toStrictEqual('paid');

    expect(payment).toBeDefined();
    expect(payment.amount).toStrictEqual(updatedInvoice.totalAmount);
    expect(payment.status).toStrictEqual('paid');
  });
});
