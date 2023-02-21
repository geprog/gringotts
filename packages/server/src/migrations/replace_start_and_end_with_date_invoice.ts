import { Migration } from '@mikro-orm/migrations';

export class MigrationReplaceStartAndEndWithDate extends Migration {
  async up(): Promise<void> {
    await this.getKnex().schema.alterTable('invoice', (table) => {
      table.dropColumn('start');
      table.renameColumn('end', 'date');
    });
  }

  async down(): Promise<void> {
    await this.getKnex().schema.alterTable('invoice', (table) => {
      table.date('start');
      table.renameColumn('date', 'end');
    });

    // TODO: set value for start
  }
}
