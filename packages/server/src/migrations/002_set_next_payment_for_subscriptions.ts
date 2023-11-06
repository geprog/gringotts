import { Migration } from '@mikro-orm/migrations';

type Invoice = {
  _id: string;
  subscription__id: string;
  date: Date;
  status: string;
};

type Subscription = {
  _id: string;
  anchor_date: Date;
  next_payment: Date;
  status: 'active' | 'error';
  error?: string;
};

export class MigrationSetNextPaymentForSubscriptions extends Migration {
  async up(): Promise<void> {
    if (
      !(await this.ctx?.schema.hasTable('subscription')) ||
      (await this.ctx?.schema.hasColumn('subscription', 'next_payment'))
    ) {
      return;
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.date('next_payment').nullable();
      table.string('status').notNullable().defaultTo('active');
      table.string('error').nullable();
    });

    const subscriptions = await this.ctx?.table('subscription').select<Subscription[]>();
    for await (const subscription of subscriptions || []) {
      const latestDraftInvoice = await this.ctx
        ?.table<Invoice>('invoice')
        .where({ subscription__id: subscription._id, status: 'draft' })
        .orderBy('date', 'desc')
        .first<Invoice>();

      const nextPayment = latestDraftInvoice?.date;
      if (nextPayment) {
        await this.ctx
          ?.table<Subscription>('subscription')
          .where({ _id: subscription._id })
          .update({ next_payment: nextPayment });
      } else {
        await this.ctx
          ?.table<Subscription>('subscription')
          .where({ _id: subscription._id })
          .update({ status: 'error', error: 'No draft subscription found', next_payment: subscription.anchor_date });
      }
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.dropNullable('next_payment');
    });

    // draft invoices where used to loop due subscriptions
    await this.ctx?.table('invoice').where({ status: 'draft' }).delete();
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('subscription', 'next_payment'))) {
      return;
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.dropColumn('next_payment');
      table.dropColumn('status');
      table.dropColumn('error');
    });
  }
}
