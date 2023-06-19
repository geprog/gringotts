import { Migration } from '@mikro-orm/migrations';

export class MigrationReplaceStartAndEndWithDate extends Migration {
  async up(): Promise<void> {
    if (
      !(await this.ctx?.schema.hasColumn('invoice', 'start')) ||
      !(await this.ctx?.schema.hasColumn('invoice', 'end'))
    ) {
      return;
    }

    await this.ctx?.schema.alterTable('invoice', (table) => {
      table.dropColumn('start');
      table.renameColumn('end', 'date');
    });
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('invoice', 'date'))) {
      return;
    }

    await this.ctx?.schema.alterTable('invoice', (table) => {
      table.date('start');
      table.renameColumn('date', 'end');
    });

    // TODO: set value for start
  }
}
