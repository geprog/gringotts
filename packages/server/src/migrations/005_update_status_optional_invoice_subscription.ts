import { Migration } from '@mikro-orm/migrations';
import dayjs from 'dayjs';

import { getPreviousPeriod } from '~/utils';

type Subscription = {
  _id: string;
  customer__id: string;
  anchor_date: Date;
  next_payment: Date;
  current_period_start: Date;
  current_period_end: Date;
};

export class MigrationReplaceNextPaymentWithCurrentPeriod extends Migration {
  async up(): Promise<void> {
    if (await this.ctx?.schema.hasColumn('subscription', 'current_period_start')) {
      return;
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.date('current_period_start').nullable();
      table.date('current_period_end').nullable();
    });

    const subscriptions = await this.ctx?.table<Subscription>('subscription').select<Subscription[]>();
    for await (const subscription of subscriptions || []) {
      const currentPeriod = getPreviousPeriod(subscription.next_payment, subscription.anchor_date);

      await this.ctx?.table('subscription').where({ _id: subscription._id }).update({
        current_period_start: currentPeriod.start,
        current_period_end: currentPeriod.end,
      });
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.dropColumn('next_payment');
      table.dropNullable('current_period_start');
      table.dropNullable('current_period_end');
    });
  }

  async down(): Promise<void> {
    if (!(await this.ctx?.schema.hasColumn('subscription', 'current_period_start'))) {
      return;
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.date('next_payment').nullable();
    });

    const subscriptions = await this.ctx?.table<Subscription>('subscription').select<Subscription[]>();
    for await (const subscription of subscriptions || []) {
      const next_payment = dayjs(subscription.current_period_end).add(1, 'day').startOf('day').add(1, 'hour').toDate();

      await this.ctx?.table('subscription').where({ _id: subscription._id }).update({
        next_payment,
      });
    }

    await this.ctx?.schema.alterTable('subscription', (table) => {
      table.dropNullable('next_payment');
      table.dropColumn('status');
      table.dropColumn('error');
    });
  }
}
