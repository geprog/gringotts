import fastifyFormBody from '@fastify/formbody';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastify, { FastifyInstance } from 'fastify';

import { config } from '~/config';
import { database } from '~/database';
import { Customer, Subscription } from '~/entities';
import dayjs from '~/lib/dayjs';
import { getPaymentProvider } from '~/providers';
import { triggerWebhook } from '~/webhook';

export async function init(): Promise<FastifyInstance> {
  const server = fastify();

  await server.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  server.addHook('onRequest', async (request, reply) => {
    // skip requests to our docs
    if (request.routerPath.startsWith('/documentation')) {
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
        title: 'Gringotts payments api',
        description: 'Documentation for the Gringotts payments api',
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
    $id: 'Invoice',
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
    $id: 'Customer',
    type: 'object',
    properties: {
      _id: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
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
      customer: { $ref: 'Customer' },
      changes: {
        type: 'array',
        items: { $ref: 'SubscriptionChange' },
      },
    },
  });

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
          $ref: 'ErrorResponse',
        },
        404: {
          $ref: 'ErrorResponse',
        },
        500: {
          $ref: 'ErrorResponse',
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

      console.log('start subscription', body);

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

      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

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

  server.patch('/subscription/:subscriptionId', {
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
          $ref: 'SuccessResponse',
        },
        400: {
          $ref: 'ErrorResponse',
        },
        404: {
          $ref: 'ErrorResponse',
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
          $ref: 'Subscription',
        },
        404: {
          $ref: 'ErrorResponse',
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
              $ref: 'Invoice',
            },
            {
              type: 'string',
            },
          ],
        },
        400: {
          $ref: 'ErrorResponse',
        },
        404: {
          $ref: 'ErrorResponse',
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
          $ref: 'Customer',
        },
        400: {
          $ref: 'ErrorResponse',
        },
        500: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as { email: string; name: string };

      console.log('Creating customer', body);

      let customer = await database.customers.findOne({ email: body.email });
      if (customer) {
        return reply.code(400).send({
          error: 'Customer already exists',
        });
      }

      customer = new Customer({ email: body.email, name: body.name });

      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }
      customer = await paymentProvider.createCustomer(customer);

      await database.em.persistAndFlush(customer);

      await reply.send(customer);
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
            $ref: 'Customer',
          },
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const { email } = request.query as Partial<{ email?: string }>;

      const customers = await database.customers.find({ email });

      await reply.send(customers);
    },
  });

  server.patch('/customer/:customerId', {
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
          $ref: 'Customer',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const { customerId } = request.params as { customerId: string };
      const { email, name } = request.body as { email: string; name: string };

      let customer = await database.customers.findOne({ _id: customerId });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      customer.email = email;
      customer.name = name;

      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      customer = await paymentProvider.updateCustomer(customer);

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
          $ref: 'SuccessResponse',
        },
        400: {
          $ref: 'ErrorResponse',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const { customerId } = request.params as { customerId: string };

      const customer = await database.customers.findOne({ _id: customerId });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      await paymentProvider.deleteCustomer(customer);

      await database.em.removeAndFlush(customer);

      await reply.send({ ok: true });
    },
  });

  server.post('/payment/webhook', {
    schema: { hidden: true },
    handler: async (request, reply) => {
      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      const payload = await paymentProvider.parsePaymentWebhook(request.body);
      if (!payload.paid) {
        return reply.code(200).send({ ok: true, hint: 'Not paid' });
      }

      const subscription = await database.subscriptions.findOne({ _id: payload.subscriptionId });
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      subscription.lastPayment = payload.paidAt;
      subscription.waitingForPayment = false;

      await database.em.persistAndFlush(subscription);

      const token = server.jwt.sign({ subscriptionId: subscription._id }, { expiresIn: '12h' });
      void triggerWebhook({
        body: {
          subscriptionId: subscription._id,
        },
        token,
      });

      await reply.send({ ok: true });
    },
  });

  return server;
}
