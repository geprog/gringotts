import { MikroORM } from '@mikro-orm/core';
import { EntityManager, EntityRepository, PostgreSqlDriver } from '@mikro-orm/postgresql';

import { config } from '~/config';
import {
  Customer,
  customerSchema,
  Invoice,
  invoiceItemSchema,
  invoiceSchema,
  Payment,
  PaymentMethod,
  paymentMethodSchema,
  paymentSchema,
  Project,
  projectInvoiceDataSchema,
  projectSchema,
  Subscription,
  subscriptionChangeSchema,
  subscriptionSchema,
} from '~/entities';
import { addExitHook } from '~/lib/exit_hooks';
import { MigrationAlterColumnLogo } from '~/migrations/alter_column_logo_to_text';
import { MigrationReplaceStartAndEndWithDate } from '~/migrations/replace_start_and_end_with_date_invoice';
import { MigrationSetNextPaymentForSubscriptions } from '~/migrations/set_next_payment_for_subscriptions';

export class Database {
  orm!: MikroORM;

  async init(): Promise<void> {
    if (!config.postgresUrl) {
      throw new Error('POSTGRES_URL is not set');
    }

    this.orm = await MikroORM.init<PostgreSqlDriver>(
      {
        type: 'postgresql',
        clientUrl: config.postgresUrl,
        entities: [
          customerSchema,
          subscriptionSchema,
          subscriptionChangeSchema,
          paymentSchema,
          invoiceSchema,
          invoiceItemSchema,
          projectSchema,
          projectInvoiceDataSchema,
          paymentMethodSchema,
        ],
        discovery: { disableDynamicFileAccess: true },
        migrations: {
          migrationsList: [
            {
              name: 'MigrationReplaceStartAndEndWithDate',
              class: MigrationReplaceStartAndEndWithDate,
            },
            {
              name: 'MigrationAlterColumnLogo',
              class: MigrationAlterColumnLogo,
            },
            {
              name: 'MigrationSetNextPaymentForSubscriptions',
              class: MigrationSetNextPaymentForSubscriptions,
            },
          ],
          disableForeignKeys: false,
        },
        schemaGenerator: {
          disableForeignKeys: false,
        },
      },
      false,
    );
  }

  async connect(): Promise<void> {
    await this.orm.connect();

    await this.orm.getMigrator().up();

    const generator = this.orm.getSchemaGenerator();
    await generator.updateSchema();

    addExitHook(() => this.orm.close());
  }

  get em(): EntityManager {
    return this.orm.em.fork() as EntityManager;
  }

  get projects(): EntityRepository<Project> {
    return this.em.getRepository(Project);
  }

  get subscriptions(): EntityRepository<Subscription> {
    return this.em.getRepository(Subscription);
  }

  get customers(): EntityRepository<Customer> {
    return this.em.getRepository(Customer);
  }

  get payments(): EntityRepository<Payment> {
    return this.em.getRepository(Payment);
  }

  get invoices(): EntityRepository<Invoice> {
    return this.em.getRepository(Invoice);
  }

  get paymentMethods(): EntityRepository<PaymentMethod> {
    return this.em.getRepository(PaymentMethod);
  }
}

export const database = new Database();
