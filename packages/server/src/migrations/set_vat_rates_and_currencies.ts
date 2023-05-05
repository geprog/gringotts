import { Migration } from '@mikro-orm/migrations';

export class MigrationSetVatRatesAndCurrencies extends Migration {
  async up(): Promise<void> {
    if (
      !(await this.ctx?.schema.hasColumn('project', 'vatRate')) ||
      !(await this.ctx?.schema.hasColumn('project', 'currency'))
    ) {
      return;
    }

    await this.ctx?.schema.alterTable('project', (table) => {
      table.string('currency').notNullable().defaultTo('EUR').alter();
      table.double('vatRate').notNullable().defaultTo(19).alter();
    });

    await this.ctx?.schema.alterTable('project', (table) => {
      table.string('currency').defaultTo(null).alter();
      table.string('vatRate').defaultTo(null).alter();
    });
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('invoice', 'date'))) {
      return;
    }

    await this.ctx?.schema.alterTable('invoice', (table) => {
      table.dropColumn('currency');
      table.dropColumn('vatRate');
    });
  }
}
