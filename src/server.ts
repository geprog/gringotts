import fastifySwagger from '@fastify/swagger';
import fastify, { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { paymentProvider } from '~/providers';
import { Subscription } from '~/types/subscription';

export async function init(): Promise<FastifyInstance> {
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

  server.post('/subscription/start', {
    schema: {
      body: {
        type: 'object',
        required: ['objectId', 'pricePerUnit', 'units', 'redirectUrl', 'customer'],
        additionalProperties: false,
        properties: {
          objectId: { type: 'string' },
          pricePerUnit: { type: 'number' },
          units: { type: 'number' },
          redirectUrl: { type: 'string' },
          customer: {
            type: 'object',
            required: ['name', 'email'],
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as {
        objectId: string;
        pricePerUnit: number;
        units: number;
        redirectUrl: string;
        customer: { name: string; email: string };
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

      const subscription = new Subscription({
        objectId: body.objectId,
        anchorDate: now,
        customer: body.customer,
      });

      const { checkoutUrl, subscription: _subscription } = await paymentProvider.startSubscription({
        subscription,
        pricePerUnit: body.pricePerUnit,
        units: body.units,
        redirectUrl: body.redirectUrl,
      });

      subscription.changePlan({ units: body.units, pricePerUnit: body.pricePerUnit });
      await database.putSubscription(_subscription);

      await reply.send({
        subscriptionId: _subscription._id,
        checkoutUrl,
      });
    },
  });

  server.post('/subscription/:subscriptionId/change', {
    schema: {}, // TODO
    handler: async (request, reply) => {
      const { plan: _plan, units } = request.body as Partial<{ plan: string; units: number }>;
      if (!_plan || !units) {
        return reply.code(400).send({
          error: 'Missing required parameters',
        });
      }

      const plan = await database.getPlan(_plan);
      if (!plan) {
        return reply.callNotFound();
      }

      if (units < 1) {
        return reply.send({ error: 'Units must be greater than 0' }).code(400);
      }

      const { subscriptionId } = request.params as { subscriptionId: string };
      const subscription = await database.getSubscription(subscriptionId);
      if (!subscription) {
        return reply.callNotFound();
      }

      subscription.changePlan({ pricePerUnit: plan.pricePerUnit, units, changeDate: new Date() });
      await database.putSubscription(subscription);

      await reply.send({ ok: true });
    },
  });

  server.post('/subscription/:subscriptionId/end', {
    schema: {}, // TODO
    handler: async (request, reply) => {
      const { subscriptionId } = request.params as Partial<{ subscriptionId: string }>;
      if (!subscriptionId) {
        return reply.code(400).send({
          error: 'Missing required parameters',
        });
      }

      const subscription = await database.getSubscription(subscriptionId);
      if (!subscription) {
        return reply.callNotFound();
      }

      // TODO: end subscription
      await database.putSubscription(subscription);

      await reply.send({ ok: true });
    },
  });

  server.get('/subscription/:subscriptionId/invoice', {
    schema: {}, // TODO
    handler: async (request, reply) => {
      const { subscriptionId } = request.params as Partial<{ subscriptionId: string }>;
      if (!subscriptionId) {
        return reply.code(400).send({
          error: 'Missing required parameters',
        });
      }

      const subscription = await database.getSubscription(subscriptionId);
      if (!subscription) {
        return reply.callNotFound();
      }

      const invoice = subscription.getPeriod(new Date()).getInvoice();

      await reply.send(invoice.toString());
    },
  });

  server.get('/payment/webhook', async (request, reply) => {
    // TODO: notify backend
    console.log(request.body);
    reply.callNotFound();
  });

  return server;
}
