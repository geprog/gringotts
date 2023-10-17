import { FastifyInstance } from 'fastify';

import { getProjectFromRequest } from '~/api/helpers';
import { database } from '~/database';
import { Payment } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';

export function paymentMethodEndpoints(server: FastifyInstance): void {
  server.post('/customer/:customerId/payment-method', {
    schema: {
      operationId: 'createPaymentMethod',
      summary: 'Create payment and by accepting it add a new payment-method',
      tags: ['payment-method'],
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
        required: ['redirectUrl'],
        additionalProperties: false,
        properties: {
          redirectUrl: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            paymentMethodId: { type: 'string' },
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
      const project = await getProjectFromRequest(request);

      const { customerId } = request.params as { customerId: string };
      if (!customerId) {
        return reply.code(400).send({
          error: 'Missing customerId',
        });
      }

      const body = request.body as {
        redirectUrl: string;
      };

      const customer = await database.customers.findOne({ _id: customerId, project });
      if (!customer) {
        return reply.code(404).send({
          error: 'Customer not found',
        });
      }

      const paymentProvider = getPaymentProvider(project);
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      const payment = new Payment({
        amount: 1, // TODO: Use the smallest amount possible
        currency: project.currency,
        description: 'Payment method verification', // TODO: use customer language
        type: 'verification',
        customer,
        status: 'pending',
      });

      const { checkoutUrl } = await paymentProvider.chargeForegroundPayment({
        project,
        payment,
        redirectUrl: body.redirectUrl,
      });

      await database.em.persistAndFlush([payment]);

      await reply.send({
        checkoutUrl,
      });
    },
  });

  server.get('/customer/:customerId/payment-method/:paymentMethodId', {
    schema: {
      operationId: 'getPaymentMethod',
      summary: 'Get a payment-method',
      tags: ['payment-method'],
      params: {
        type: 'object',
        required: ['customerId', 'paymentMethodId'],
        additionalProperties: false,
        properties: {
          customerId: { type: 'string' },
          paymentMethodId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'PaymentMethod',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { paymentMethodId } = request.params as { paymentMethodId: string; customerId: string };

      const paymentMethod = await database.paymentMethods.findOne({ _id: paymentMethodId, project });
      if (!paymentMethod) {
        return reply.code(404).send({ error: 'Payment-method not found' });
      }

      await reply.send(paymentMethod);
    },
  });

  server.get('/customer/:customerId/payment-method', {
    schema: {
      operationId: 'listPaymentMethods',
      summary: 'Get all payment-methods of a customer',
      tags: ['payment-method'],
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
          type: 'array',
          items: {
            $ref: 'PaymentMethod',
          },
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { customerId } = request.params as { paymentMethodId: string; customerId: string };

      const customer = await database.customers.findOne({ _id: customerId, project }, { populate: ['paymentMethods'] });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      await reply.send(customer.paymentMethods.getItems());
    },
  });

  server.delete('/customer/:customerId/payment-method/:paymentMethodId', {
    schema: {
      operationId: 'deletePaymentMethod',
      summary: 'Delete a payment method',
      tags: ['payment-method'],
      params: {
        type: 'object',
        required: ['customerId', 'paymentMethodId'],
        additionalProperties: false,
        properties: {
          customerId: { type: 'string' },
          paymentMethodId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
          },
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { paymentMethodId } = request.params as { paymentMethodId: string };

      const paymentMethod = await database.paymentMethods.findOne({ _id: paymentMethodId, project });
      if (!paymentMethod) {
        return reply.code(404).send({ error: 'Payment-method not found' });
      }

      await database.em.removeAndFlush(paymentMethod);

      await reply.send({ ok: true });
    },
  });
}
