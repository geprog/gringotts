import { Migration } from '@mikro-orm/migrations';

type Payment = {
  _id: string;
  status: 'pending' | 'processing';
};

export class MigrationPaymentStatusFromPendingToProcessing extends Migration {
  async up(): Promise<void> {
    await this.ctx?.table<Payment>('payment').where({ status: 'pending' }).update({
      status: 'processing',
    });
  }

  async down(): Promise<void> {
    await this.ctx?.table<Payment>('pending').where({ status: 'processing' }).update({
      status: 'pending',
    });
  }
}
