import { EntitySchema } from '@mikro-orm/core';
import { v4 } from 'uuid';

export class ProjectInvoiceData {
  _id: string = v4();
  name!: string;
  email!: string;
  addressLine1!: string;
  addressLine2!: string;
  city!: string;
  zipCode!: string;
  country!: string;
  logo!: string;

  constructor(data?: Partial<ProjectInvoiceData>) {
    Object.assign(this, data);
  }
}

export const projectInvoiceDataSchema = new EntitySchema<ProjectInvoiceData>({
  class: ProjectInvoiceData,
  properties: {
    _id: { type: 'uuid', onCreate: () => v4(), primary: true },
    name: { type: 'string' },
    email: { type: 'string' },
    addressLine1: { type: 'string' },
    addressLine2: { type: 'string', nullable: true },
    city: { type: 'string' },
    zipCode: { type: 'string' },
    country: { type: 'string' },
    logo: { type: 'text', nullable: true },
  },
});
