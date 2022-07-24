import fastifyFormBody from '@fastify/formbody';
import fastifySwagger from '@fastify/swagger';
import fastify, { FastifyInstance } from 'fastify';

import { config } from '~/config';
import { database } from '~/database';
import { Customer, Subscription } from '~/entities';
import dayjs from '~/lib/dayjs';
import { Mollie } from '~/providers/mollie';
import { PaymentProvider } from '~/providers/types';

export async function init(): Promise<FastifyInstance> {
  const paymentProvider: PaymentProvider = new Mollie({ apiKey: config.mollieApiKey });

  const server = fastify();

  await server.register(fastifySwagger, {
    routePrefix: '/documentation',
    swagger: {
      info: {
        title: 'Payment gateway',
        description: 'Documentation for the payment gateway api',
        version: '0.1.0',
      },
      host: 'localhost:3000',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
    exposeRoute: true,
  });

  server.addSchema({
    $id: 'responses/success',
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
    },
  });

  server.addSchema({
    $id: 'responses/error',
    type: 'object',
    properties: {
      error: { type: 'string' },
    },
  });

  server.addSchema({
    $id: 'entities/invoice',
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
            units: { type: 'number' },
            pricePerUnit: { type: 'number' },
          },
        },
      },
      start: { type: 'string' },
      end: { type: 'string' },
    },
  });

  server.addSchema({
    $id: 'entities/customer',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
    },
  });

  server.addSchema({
    $id: 'entities/subscription_change',
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
    $id: 'entities/subscription',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      anchorDate: { type: 'string' },
      lastPayment: { type: 'string' },
      // customer: { $ref: 'entities/customer' },
      customer: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
        },
      },
      changes: {
        type: 'array',
        // items: { $ref: 'entities/subscription_change' },
        items: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            start: { type: 'string' },
            end: { type: 'string' },
            pricePerUnit: { type: 'number' },
            units: { type: 'number' },
          },
        },
      },
    },
  });

  await server.register(fastifyFormBody);

  server.post('/subscription/start', {
    schema: {
      body: {
        type: 'object',
        required: ['pricePerUnit', 'units', 'redirectUrl', 'customerId'],
        additionalProperties: false,
        properties: {
          pricePerUnit: { type: 'number' },
          units: { type: 'number' },
          redirectUrl: { type: 'string' },
          customerId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            subscriptionId: { type: 'string' },
            checkoutUrl: { type: 'string' },
          },
        },
        400: {
          $ref: 'responses/error',
        },
        404: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as {
        pricePerUnit: number;
        units: number;
        redirectUrl: string;
        customerId: string;
      };

      if (body.units < 1) {
        return reply.code(400).send({
          error: 'Units must be greater than 0',
        });
      }

      if (body.pricePerUnit < 0) {
        return reply.code(400).send({
          error: 'Price per unit must be greater than 0',
        });
      }

      const now = new Date();

      const customer = await database.customers.findOne({ _id: body.customerId }, { populate: ['subscriptions'] });
      if (!customer) {
        return reply.code(404).send({
          error: 'Customer not found',
        });
      }

      const subscription = new Subscription({
        anchorDate: now,
        customer,
      });

      subscription.changePlan({ units: body.units, pricePerUnit: body.pricePerUnit });

      const { checkoutUrl } = await paymentProvider.startSubscription({
        subscription,
        pricePerUnit: body.pricePerUnit,
        units: body.units,
        redirectUrl: body.redirectUrl,
      });

      customer.subscriptions.add(subscription);

      await database.em.persistAndFlush([customer, subscription]);

      await reply.send({
        subscriptionId: subscription._id,
        checkoutUrl,
      });
    },
  });

  server.post('/subscription/:subscriptionId', {
    schema: {
      params: {
        type: 'object',
        required: ['subscriptionId'],
        additionalProperties: false,
        properties: {
          subscriptionId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['pricePerUnit', 'units'],
        additionalProperties: false,
        properties: {
          pricePerUnit: { type: 'number' },
          units: { type: 'number' },
        },
      },
      response: {
        200: {
          $ref: 'responses/success',
        },
        400: {
          $ref: 'responses/error',
        },
        404: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as { pricePerUnit: number; units: number };

      if (body.units < 1) {
        return reply.code(400).send({
          error: 'Units must be greater than 0',
        });
      }

      if (body.pricePerUnit < 0) {
        return reply.code(400).send({
          error: 'Price per unit must be greater than 0',
        });
      }

      const { subscriptionId } = request.params as { subscriptionId: string };

      const subscription = await database.subscriptions.findOne(
        { _id: subscriptionId },
        { populate: ['customer', 'changes'] },
      );
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      subscription.changePlan({ pricePerUnit: body.pricePerUnit, units: body.units, changeDate: new Date() });
      await database.em.persistAndFlush(subscription);

      await reply.send({ ok: true });
    },
  });

  server.get('/subscription/:subscriptionId', {
    schema: {
      params: {
        type: 'object',
        required: ['subscriptionId'],
        additionalProperties: false,
        properties: {
          subscriptionId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'entities/subscription',
        },
        404: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const { subscriptionId } = request.params as { subscriptionId: string };

      const subscription = await database.subscriptions.findOne(
        { _id: subscriptionId },
        { populate: ['customer', 'changes'] },
      );
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      await reply.send({ subscription });
    },
  });

  server.get('/subscription/:subscriptionId/invoice', {
    schema: {
      params: {
        type: 'object',
        required: ['subscriptionId'],
        additionalProperties: false,
        properties: {
          subscriptionId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'string'], default: 'json' },
          date: { type: 'string', description: 'Date as ISO string inside the period to get an invoice for' },
        },
      },
      response: {
        200: {
          oneOf: [
            {
              $ref: 'entities/invoice',
            },
            {
              type: 'string',
            },
          ],
        },
        400: {
          $ref: 'responses/error',
        },
        404: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const { subscriptionId } = request.params as Partial<{ subscriptionId: string }>;
      const { date, format } = request.query as Partial<{ date?: string; format: 'json' | 'string' }>;

      const subscription = await database.subscriptions.findOne(
        { _id: subscriptionId },
        { populate: ['customer', 'changes'] },
      );
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      const period = subscription.getPeriod(date ? dayjs(date).toDate() : new Date());
      const invoice = period.getInvoice();

      if (format === 'string') {
        await reply.send(invoice.toString());
      } else {
        await reply.send(invoice);
      }
    },
  });

  server.post('/customer', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'name'],
        additionalProperties: false,
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'entities/customer',
        },
        400: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as { email: string; name: string };

      const customer = await database.customers.findOne({ email: body.email });
      if (customer) {
        return reply.code(400).send({
          error: 'Customer already exists',
        });
      }

      const newCustomer = new Customer({ email: body.email, name: body.name });
      await database.em.persistAndFlush(newCustomer);

      await reply.send(newCustomer._id);
    },
  });

  server.get('/customer', {
    schema: {
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          email: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            $ref: 'entities/customer',
          },
        },
        404: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const { email } = request.query as Partial<{ email?: string }>;

      const customers = await database.customers.find({ email });

      await reply.send(customers);
    },
  });

  server.put('/customer/:customerId', {
    schema: {
      params: {
        type: 'object',
        required: ['customerId'],
        additionalProperties: false,
        properties: {
          customerId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['email', 'name'],
        additionalProperties: false,
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'entities/customer',
        },
        404: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const { customerId } = request.params as { customerId: string };
      const { email, name } = request.body as { email: string; name: string };

      const customer = await database.customers.findOne({ _id: customerId });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      customer.email = email;
      customer.name = name;

      await database.em.persistAndFlush(customer);
    },
  });

  server.delete('/customer/:customerId', {
    schema: {
      params: {
        type: 'object',
        required: ['customerId'],
        additionalProperties: false,
        properties: {
          customerId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'responses/success',
        },
        400: {
          $ref: 'responses/error',
        },
        404: {
          $ref: 'responses/error',
        },
      },
    },
    handler: async (request, reply) => {
      const { customerId } = request.params as { customerId: string };

      const customer = await database.customers.findOne({ _id: customerId });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      await database.em.removeAndFlush(customer);

      await reply.send({ ok: true });
    },
  });

  server.post('/payment/webhook', {
    schema: { hidden: true },
    handler: async (request, reply) => {
      const payload = await paymentProvider.parsePaymentWebhook(request.body);

      const subscription = await database.subscriptions.findOne({ _id: payload.subscriptionId });
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      subscription.lastPayment = payload.paidAt;

      await database.em.persistAndFlush(subscription);

      // TODO: notify backend

      await reply.send({ ok: true });
    },
  });

  return server;
}
