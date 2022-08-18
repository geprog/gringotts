import fastifyFormBody from '@fastify/formbody';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastify, { FastifyInstance } from 'fastify';

import { config } from '~/config';

import { customerEndpoints } from './endpoints/customer';
import { invoiceEndpoints } from './endpoints/invoice';
import { paymentEndpoints } from './endpoints/payment';
import { subscriptionEndpoints } from './endpoints/subscriptions';

export async function init(): Promise<FastifyInstance> {
  const server = fastify({
    logger: {
      transport:
        process.env.NODE_ENV !== 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  await server.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  server.addHook('onRequest', async (request, reply) => {
    if (!request.routerPath) {
      await reply.code(404).send({
        error: 'Not found',
      });
      return;
    }

    // skip requests to our docs
    if (request.routerPath?.startsWith('/documentation')) {
      return;
    }

    if (request.routerPath === '/payment/webhook') {
      return;
    }

    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.send(err);
    }
  });

  await server.register(fastifyFormBody);

  await server.register(fastifySwagger, {
    routePrefix: '/documentation',
    swagger: {
      info: {
        title: 'Gringotts api',
        description: 'Documentation for the Gringotts api',
        version: '0.1.0',
      },
      host: 'localhost:3000',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        authorization: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
      security: [{ authorization: [] }],
    },
    refResolver: {
      buildLocalReference(json) {
        if (!json.title && json.$id) {
          json.title = json.$id;
        }
        return json.$id as string;
      },
    },
    exposeRoute: true,
  });

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
    $id: 'Payment',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      status: { type: 'string' },
      currency: { type: 'string' },
      amount: { type: 'number' },
      description: { type: 'number' },
      isRecurring: { type: 'boolean' },
    },
  });

  server.addSchema({
    $id: 'InvoiceItem',
    type: 'object',
    properties: {
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
      start: { type: 'string' },
      end: { type: 'string' },
      sequentialId: { type: 'number' },
      items: {
        type: 'array',
        items: {
          $ref: 'InvoiceItem',
        },
      },
      status: { type: 'string' },
      currency: { type: 'string' },
      vatRate: { type: 'number' },
      amount: { type: 'number' },
      vatAmount: { type: 'number' },
      totalAmount: { type: 'number' },
      number: { type: 'number' },
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
      lastPayment: { type: 'string' },
      activeUntil: { type: 'string' },
      customer: { $ref: 'Customer' },
      changes: {
        type: 'array',
        items: { $ref: 'SubscriptionChange' },
      },
      invoices: {
        type: 'array',
        items: { $ref: 'Invoice' },
      },
    },
  });

  subscriptionEndpoints(server);
  customerEndpoints(server);
  invoiceEndpoints(server);
  paymentEndpoints(server);

  return server;
}
