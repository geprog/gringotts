import { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { Customer } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';

export function customerEndpoints(server: FastifyInstance): void {
  server.post('/customer', {
    schema: {
      tags: ['customer'],
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
      tags: ['customer'],
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
      tags: ['customer'],
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
      tags: ['customer'],
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
}
