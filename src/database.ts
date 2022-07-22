import { AbstractEntity, Ref } from '~/types/abstract_entity';
import { Plan } from '~/types/plan';
import { Subscription } from '~/types/subscription';

// TODO
const bookypPlans: Record<string, Plan> = {
  free: new Plan({
    name: 'Free',
    pricePerUnit: 0,
  }),
  enterprise: new Plan({
    name: 'Enterprise',
    pricePerUnit: 1.5,
  }),
  public: new Plan({
    name: 'Public',
    pricePerUnit: 15,
  }),
  sponsored: new Plan({
    name: 'Sponsored',
    pricePerUnit: 0,
  }),
};

export class Database {
  items: Record<string, Record<string, unknown>> = {};

  // eslint-disable-next-line @typescript-eslint/require-await
  async get<T extends AbstractEntity>(collection: string, id: string): Promise<T | undefined> {
    return this.items?.[collection]?.[id] as T | undefined;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async all<T extends AbstractEntity>(collection: string): Promise<T[]> {
    return Object.values(this.items?.[collection] || []) as T[];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async put<T extends AbstractEntity>(collection: string, id: string, item: Partial<T>): Promise<void> {
    const oldItem = (this.items?.[collection]?.[id] || {}) as T;
    this.items[id] = { ...oldItem, ...item };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async remove(collection: string, id: string): Promise<void> {
    delete this.items?.[collection]?.[id];
  }

  async putSubscription(subscription: Subscription): Promise<void> {
    await this.put('subscription', subscription._id, subscription);
  }

  async removeSubscription(subscription: Ref<Subscription> | Subscription): Promise<void> {
    const subscriptionId = typeof subscription === 'string' ? subscription : subscription._id;
    await this.remove('subscription', subscriptionId);
  }

  async getSubscription(subscriptionId: Ref<Subscription>): Promise<Subscription | undefined> {
    return this.get('subscription', subscriptionId);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async putPlan(plan: Plan): Promise<void> {
    bookypPlans[plan._id] = plan;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async removePlan(subscription: Ref<Plan> | Plan): Promise<void> {
    if (typeof subscription === 'string') {
      delete bookypPlans[subscription];
    } else {
      delete bookypPlans[subscription._id];
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getPlan(planId: Ref<Plan>): Promise<Plan | undefined> {
    return bookypPlans[planId];
  }
}

export const database = new Database();
