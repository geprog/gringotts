import { Migration } from '@mikro-orm/migrations';

type Invoice = {
  _id: string;
  subscription__id: string;
  customer__id: string;
};

type Subscription = {
  _id: string;
  customer__id: string;
  anchor_date: Date;
  next_payment: Date;
  current_period_start: Date;
  current_period_end: Date;
};

export class MigrationUpdateInvoiceAddCustomerAndAllowOptionalSubscription extends Migration {
  async up(): Promise<void> {
    if (
      !(await this.ctx?.schema.hasTable('invoice')) ||
      (await this.ctx?.schema.hasColumn('invoice', 'customer__id'))
    ) {
      return;
    }

    // add customer to invoices directly (previously it was only set on a linked subscription)
    // and make subscription optional
    await this.ctx?.schema.alterTable('invoice', (table) => {
      table.uuid('customer__id').nullable();
      table.setNullable('subscription__id');
    });

    const invoices = await this.ctx?.table('invoice').select<Invoice[]>();
    for await (const invoice of invoices || []) {
      const subscription = await this.ctx
        ?.table<Subscription>('subscription')
        .where({ _id: invoice.subscription__id })
        .first<Subscription>();

      if (!subscription) {
        throw new Error(`Subscription ${invoice.subscription__id} not found although it is required`);
      }

      await this.ctx?.table('invoice').where({ _id: invoice._id }).update({
        customer__id: subscription.customer__id,
      });
    }

    await this.ctx?.schema.alterTable('invoice', (table) => {
      table.dropNullable('customer__id');
    });
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('invoice', 'customer__id'))) {
      return;
    }

    await this.ctx
      ?.table<Invoice>('invoice')
      .where({
        subscription__id: undefined,
      })
      .delete();

    await this.ctx?.schema.alterTable('invoice', (table) => {
      table.dropNullable('subscription__id');
      table.dropColumn('customer__id');
    });
  }
}
