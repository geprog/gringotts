import { Migration } from '@mikro-orm/migrations';

export class MigrationSetNextPaymentForSubscriptions extends Migration {
  async up(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('subscription', 'nextPayment'))) {
      return;
    }

    await this.ctx?.schema.alterTable('invoice', (table) => {
      table.date('nextPayment'); // TODO: set value for nextPayment
    });

    // TODO: drop all draft invoices
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
