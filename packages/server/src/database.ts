import { MikroORM } from '@mikro-orm/core';
import { EntityManager, EntityRepository, PostgreSqlDriver } from '@mikro-orm/postgresql';

import {
  Customer,
  customerSchema,
  Subscription,
  SubscriptionChange,
  subscriptionChangeSchema,
  subscriptionSchema,
} from '~/entities';

export class Database {
  orm!: MikroORM;

  async init(): Promise<void> {
    this.orm = await MikroORM.init<PostgreSqlDriver>({
      type: 'postgresql',
      dbName: 'postgres',
      clientUrl: 'postgresql://postgres:pA_sw0rd@localhost:5432/postgres',
      entities: [customerSchema, subscriptionSchema, subscriptionChangeSchema],
      discovery: { disableDynamicFileAccess: true },
    });

    await this.orm.connect();

    const generator = this.orm.getSchemaGenerator();
    await generator.updateSchema();
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
}

export const database = new Database();
