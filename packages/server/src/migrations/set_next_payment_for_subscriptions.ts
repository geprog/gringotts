import { Migration } from '@mikro-orm/migrations';

type Subscription = {
  _id: string;
  anchorDate: Date;
  nextPayment: Date;
};

export class MigrationSetNextPaymentForSubscriptions extends Migration {
  async up(): Promise<void> {
    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.date('nextPayment').defaultTo(new Date());
    });

    const subscriptions = await this.ctx?.table('subscription').where({ status: 'active' }).select<Subscription[]>();
    for await (const subscription of subscriptions || []) {
      const nextPayment = new Date(); // TODO: think about fair nextPayment date and how we can calculate it

      await this.ctx?.table('subscription').where({ _id: subscription._id }).update({ nextPayment });
    }

    // draft invoices where used to loop due subscriptions
    await this.ctx?.table('invoice').where({ status: 'draft' }).delete();
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('subscription', 'nextPayment'))) {
      return;
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.dropColumn('nextPayment');
    });
  }
}
