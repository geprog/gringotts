import fastifyFormBody from '@fastify/formbody';
import fastifySwagger from '@fastify/swagger';
import fastify, { FastifyInstance } from 'fastify';

import { config } from '~/config';
import { database } from '~/database';
import { Subscription } from '~/entities';
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
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
    exposeRoute: true,
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

  server.post('/subscription/:subscriptionId/change', {
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
        return reply.send({ error: 'Subscription not found' }).code(404);
      }

      subscription.changePlan({ pricePerUnit: body.pricePerUnit, units: body.units, changeDate: new Date() });
      await database.em.persistAndFlush(subscription);

      await reply.send({ ok: true });
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

  server.post('/payment/webhook', async (request, reply) => {
    const payload = await paymentProvider.parsePaymentWebhook(request.body);

    const subscription = await database.subscriptions.findOne({ _id: payload.subscriptionId });
    if (!subscription) {
      return reply.code(404).send({ error: 'Subscription not found' });
    }

    subscription.lastPayment = payload.paidAt;

    console.log(subscription);

    await database.em.persistAndFlush(subscription);

    // TODO: notify backend

    await reply.send({ ok: true });
  });

  return server;
}
