export abstract class AbstractEntity {
  _id!: string;
}

export type Ref<T extends AbstractEntity> = T['_id'];
