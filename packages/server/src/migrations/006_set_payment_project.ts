import { Migration } from '@mikro-orm/migrations';

type Payment = {
  _id: string;
  customer__id: string;
  project__id: string;
};

type Customer = {
  _id: string;
  project__id: string;
};

export class MigrationSetPaymentProject extends Migration {
  async up(): Promise<void> {
    if (!(await this.ctx?.schema.hasTable('payment')) || (await this.ctx?.schema.hasColumn('payment', 'project__id'))) {
      return;
    }

    await this.ctx?.schema.alterTable('payment', (table) => {
      table.uuid('project__id').nullable();
    });

    const payments = await this.ctx?.table<Payment>('payment').select<Payment[]>();
    for await (const payment of payments || []) {
      const customer = await this.ctx
        ?.table<Customer>('customer')
        .where({ _id: payment.customer__id })
        .first<Customer>();

      await this.ctx?.table<Payment>('payment').where({ _id: payment._id }).update({
        project__id: customer?.project__id,
      });
    }

    await this.ctx?.schema.alterTable('payment', (table) => {
      table.dropNullable('project__id');
    });
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('payment', 'project__id'))) {
      return;
    }

    await this.ctx?.schema.alterTable('payment', (table) => {
      table.dropColumn('project__id');
    });
  }
}
