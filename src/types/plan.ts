import { AbstractEntity } from '~/types/abstract_entity';

export class Plan extends AbstractEntity {
  name!: string;
  pricePerUnit!: number;

  constructor(data: Partial<Plan>) {
    super();
    Object.assign(this, data);
  }
}
