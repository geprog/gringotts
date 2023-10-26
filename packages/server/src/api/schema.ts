import { FastifyInstance } from 'fastify';

export function addSchemas(server: FastifyInstance): void {
  server.addSchema({
    $id: 'SuccessResponse',
    type: 'object',
    description: 'Success response',
    properties: {
      ok: { type: 'boolean' },
    },
  });

  server.addSchema({
    $id: 'ErrorResponse',
    type: 'object',
    description: 'Error response',
    properties: {
      error: { type: 'string' },
    },
  });

  server.addSchema({
    $id: 'ProjectInvoiceData',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string' },
      zipCode: { type: 'string' },
      city: { type: 'string' },
      country: { type: 'string' },
    },
  });

  server.addSchema({
    $id: 'Project',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string' },
      apiToken: { type: 'string' },
      mollieApiKey: { type: 'string' },
      paymentProvider: { type: 'string' },
      webhookUrl: { type: 'string' },
      invoiceData: { $ref: 'ProjectInvoiceData' },
      currency: { type: 'string' },
      vatRate: { type: 'number' },
    },
  });

  server.addSchema({
    $id: 'Payment',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      type: { type: 'string' },
      status: { type: 'string' },
      currency: { type: 'string' },
      amount: { type: 'number' },
      description: { type: 'number' },
    },
  });

  server.addSchema({
    $id: 'InvoiceItem',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      description: { type: 'string' },
      units: { type: 'number' },
      pricePerUnit: { type: 'number' },
    },
  });

  server.addSchema({
    $id: 'Invoice',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      date: { type: 'string' },
      sequentialId: { type: 'number' },
      items: {
        type: 'array',
        items: {
          $ref: 'InvoiceItem',
        },
      },
      subscription: { type: 'object', properties: { _id: { type: 'string' } }, additionalProperties: false },
      // subscription: { $ref: 'Subscription' },
      customer: { $ref: 'Customer' },
      status: { type: 'string' },
      currency: { type: 'string' },
      vatRate: { type: 'number' },
      amount: { type: 'number' },
      vatAmount: { type: 'number' },
      totalAmount: { type: 'number' },
      number: { type: 'string' },
    },
  });

  server.addSchema({
    $id: 'Customer',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string' },
      zipCode: { type: 'string' },
      city: { type: 'string' },
      country: { type: 'string' },
      invoicePrefix: { type: 'string' },
      invoiceCounter: { type: 'string' },
      balance: { type: 'number' },
      activePaymentMethod: { $ref: 'PaymentMethod' },
    },
  });

  server.addSchema({
    $id: 'SubscriptionChange',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      start: { type: 'string' },
      end: { type: 'string' },
      pricePerUnit: { type: 'number' },
      units: { type: 'number' },
    },
  });

  server.addSchema({
    $id: 'Subscription',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      anchorDate: { type: 'string' },
      status: { type: 'string' },
      error: { type: 'string' },
      lastPayment: { type: 'string' },
      currentPeriodStart: { type: 'string' },
      currentPeriodEnd: { type: 'string' },
      activeUntil: { type: 'string' },
      customer: { $ref: 'Customer' },
      changes: {
        type: 'array',
        items: { $ref: 'SubscriptionChange' },
      },
      // invoices: {
      //   type: 'array',
      //   items: { $ref: 'Invoice' },
      // },
    },
  });

  server.addSchema({
    $id: 'PaymentMethod',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      customer: { $ref: 'Customer' },
      type: { type: 'string' },
      name: { type: 'string' },
    },
  });
}
