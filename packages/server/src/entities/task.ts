import { EntitySchema, ReferenceType } from '@mikro-orm/core';
import { v4 } from 'uuid';

import { Project } from './project';

export class Task {
  _id: string = v4();
  type: 'charge_subscription' = 'charge_subscription';
  executeAt!: Date;
  startedAt?: Date;
  endedAt?: Date;
  error?: string;
  project!: Project;
  data: unknown;

  constructor(data?: Partial<Task>) {
    Object.assign(this, data);
  }
}

export const taskSchema = new EntitySchema<Task>({
  class: Task,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    type: { type: 'string' },
    executeAt: { type: Date },
    startedAt: { type: Date, nullable: true },
    endedAt: { type: Date, nullable: true },
    error: { type: 'string', nullable: true },
    data: { type: 'json' },
    project: {
      reference: ReferenceType.MANY_TO_ONE,
      entity: () => Project,
    },
  },
});
