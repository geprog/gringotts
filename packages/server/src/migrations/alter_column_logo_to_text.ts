import { Migration } from '@mikro-orm/migrations';

export class MigrationAlterColumnLogo extends Migration {
  async up(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('project_invoice_data', 'logo'))) {
      return;
    }

    await this.ctx?.schema.alterTable('project_invoice_data', (table) => {
      table.text('logo').nullable().alter();
    });
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('project_invoice_data', 'logo'))) {
      return;
    }

    await this.ctx?.schema.alterTable('project_invoice_data', (table) => {
      table.string('logo', 255).alter();
    });
  }
}
