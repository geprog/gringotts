import fastifyFormBody from '@fastify/formbody';
import fastifyJwt from '@fastify/jwt';
import fastifySwagger from '@fastify/swagger';
import fastify, { FastifyInstance } from 'fastify';

import { config } from '~/config';
import { database } from '~/database';
import { Invoice } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';
import { triggerWebhook } from '~/webhook';

import { customerEndpoints } from './endpoints/customer';
import { invoiceEndpoints } from './endpoints/invoice';
import { subscriptionEndpoints } from './endpoints/subscription';
import { addSchemas } from './schema';

export async function init(): Promise<FastifyInstance> {
  const server = fastify({
    logger: true,
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

  addSchemas(server);

  server.post('/payment/webhook', {
    schema: { hide: true },
    handler: async (request, reply) => {
      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      const payload = await paymentProvider.parsePaymentWebhook(request.body);

      const payment = await database.payments.findOne({ _id: payload.paymentId }, { populate: ['subscription'] });
      if (!payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      const subscription = payment.subscription;

      let invoice: Invoice;
      if (payment.isRecurring) {
        const _invoice = await database.invoices.findOne({ payment }, { populate: ['subscription'] });
        if (!_invoice) {
          throw new Error('Payment has no invoice');
        }
        invoice = _invoice;
      } else {
        await database.em.populate(subscription, ['invoices']);

        if (subscription.invoices.length < 1) {
          throw new Error('Subscription has no invoices');
        }

        invoice = subscription.invoices[0];
      }

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (payload.paymentStatus === 'paid') {
        subscription.lastPayment = payload.paidAt;
        payment.status = 'paid';
        invoice.status = 'paid';
      }

      await database.em.persistAndFlush([payment, invoice, subscription]);

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

  subscriptionEndpoints(server);
  customerEndpoints(server);
  invoiceEndpoints(server);

  return server;
}
