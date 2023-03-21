import dayjs from 'dayjs';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import * as config from '~/config';
import * as databaseExports from '~/database';
import { getFixtures } from '$/fixtures';

import { Customer, Invoice, Payment } from './entities';
import { chargeCustomerInvoice, chargeInvoices } from './loop';
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

  it('should loop and charge for open invoices', async () => {
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
    };

    testData.invoice.items.removeAll();
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

    const invoiceDate = dayjs(testData.invoice.date);
    vi.setSystemTime(invoiceDate.add(1, 'day').toDate());

    // before when
    let oldInvoice = db.invoices.get(testData.invoice._id);
    expect(oldInvoice?.status).toStrictEqual('draft');
    expect(oldInvoice?.items.length).toStrictEqual(0);
    expect(oldInvoice?.date).toStrictEqual(invoiceDate.toDate());

    // when
    await chargeInvoices();

    // then
    oldInvoice = db.invoices.get(testData.invoice._id);
    expect(oldInvoice).toBeDefined();
    expect(oldInvoice?.status).toStrictEqual('pending');
    expect(oldInvoice?.items.length).toStrictEqual(3);
    const itemAmounts = [(14 / 31) * 12 * 12.34, (5 / 31) * 15 * 12.34, (12 / 31) * 15 * 5.43];
    expect(oldInvoice?.amount).toStrictEqual(itemAmounts.reduce((sum, amount) => sum + Invoice.roundPrice(amount), 0));

    expect(db.payments.size).toBe(1);
    const payment = Array.from(db.payments.values())[0];
    expect(payment).toBeDefined();
    expect(payment.status).toStrictEqual('pending');
    expect(payment.amount).toStrictEqual(oldInvoice?.totalAmount);

    expect(db.invoices.size).toBe(2);
    const newInvoice = Array.from(db.invoices.values()).at(-1);
    expect(newInvoice).toBeDefined();
    expect(newInvoice?.date).toStrictEqual(invoiceDate.add(1, 'month').toDate());
    expect(newInvoice?.status).toStrictEqual('draft');
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

    // when
    await chargeCustomerInvoice({ invoice, customer });

    // then
    expect(persistAndFlush).toBeCalledTimes(3);
    const [[updatedCustomer, updatedInvoice]] = persistAndFlush.mock.calls[2] as [[Customer, Invoice]];
    expect(updatedInvoice).toBeDefined();
    expect(updatedInvoice.items.getItems().find((i) => i.description === 'Credit')).toBeDefined();
    expect(updatedInvoice.amount).toStrictEqual(Invoice.roundPrice(invoiceAmount - balance));
    expect(updatedInvoice.totalAmount).toStrictEqual(
      Invoice.roundPrice((invoiceAmount - balance) * (1 + invoice.vatRate / 100)),
    );

    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer.balance).toStrictEqual(0);
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

    // when
    await chargeCustomerInvoice({ invoice, customer });

    // then
    expect(persistAndFlush).toBeCalledTimes(2);
    const [[updatedCustomer, updatedInvoice]] = persistAndFlush.mock.calls[1] as [[Customer, Invoice]];
    expect(updatedInvoice).toBeDefined();
    expect(updatedInvoice.items.getItems().find((i) => i.description === 'Credit')).toBeDefined();
    expect(updatedInvoice.amount).toStrictEqual(0);
    expect(updatedInvoice.totalAmount).toStrictEqual(0);

    expect(updatedCustomer).toBeDefined();
    expect(updatedCustomer.balance).toStrictEqual(balance - invoiceAmount);
  });
});
