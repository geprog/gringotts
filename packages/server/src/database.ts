import { MikroORM } from '@mikro-orm/core';
import { EntityManager, EntityRepository, PostgreSqlDriver } from '@mikro-orm/postgresql';

import { config } from '~/config';
import {
  Customer,
  customerSchema,
  Invoice,
  InvoiceItem,
  invoiceItemSchema,
  invoiceSchema,
  Payment,
  paymentSchema,
  Subscription,
  SubscriptionChange,
  subscriptionChangeSchema,
  subscriptionSchema,
} from '~/entities';
import { addExitHook } from '~/lib/exit_hooks';

export class Database {
  orm!: MikroORM;

  async init(): Promise<void> {
    if (!config.postgresUrl) {
      throw new Error('POSTGRES_URL is not set');
    }

    this.orm = await MikroORM.init<PostgreSqlDriver>({
      type: 'postgresql',
      clientUrl: config.postgresUrl,
      entities: [
        customerSchema,
        subscriptionSchema,
        subscriptionChangeSchema,
        paymentSchema,
        invoiceSchema,
        invoiceItemSchema,
      ],
      discovery: { disableDynamicFileAccess: true },
    });
  }

  async connect(): Promise<void> {
    await this.orm.connect();

    const generator = this.orm.getSchemaGenerator();
    await generator.updateSchema();

    addExitHook(() => this.orm.close());
  }

  get em(): EntityManager {
    return this.orm.em.fork() as EntityManager;
  }

  get subscriptions(): EntityRepository<Subscription> {
    return this.em.getRepository(Subscription);
  }

  get customers(): EntityRepository<Customer> {
    return this.em.getRepository(Customer);
  }

  get subscriptionChanges(): EntityRepository<SubscriptionChange> {
    return this.em.getRepository(SubscriptionChange);
  }

  get payments(): EntityRepository<Payment> {
    return this.em.getRepository(Payment);
  }

  get invoices(): EntityRepository<Invoice> {
    return this.em.getRepository(Invoice);
  }

  get invoiceItems(): EntityRepository<InvoiceItem> {
    return this.em.getRepository(InvoiceItem);
  }
}

export const database = new Database();
