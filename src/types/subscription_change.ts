export type SubscriptionChange = {
  start: Date;
  end?: Date;
  pricePerUnit: number;
  units: number;
};
