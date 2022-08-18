import { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { Customer } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';

export function customerEndpoints(server: FastifyInstance): void {
  type CustomerUpdateBody = Pick<
    Customer,
    'addressLine1' | 'addressLine2' | 'city' | 'country' | 'email' | 'name' | 'zipCode'
  >;

  server.addSchema({
    $id: 'CustomerUpdateBody',
    type: 'object',
    required: ['email', 'name', 'addressLine1', 'addressLine2', 'zipCode', 'city', 'country'],
    additionalProperties: false,
    properties: {
      email: { type: 'string' },
      name: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string' },
      zipCode: { type: 'string' },
      city: { type: 'string' },
      country: { type: 'string' },
    },
  });

  server.post('/customer', {
    schema: {
      tags: ['customer'],
      body: {
        $ref: 'CustomerUpdateBody',
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
      const body = request.body as CustomerUpdateBody;

      let customer = await database.customers.findOne({ email: body.email });
      if (customer) {
        return reply.code(400).send({
          error: 'Customer already exists',
        });
      }

      customer = new Customer({
        email: body.email,
        name: body.name,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        country: body.country,
        zipCode: body.zipCode,
      });

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
        $ref: 'CustomerUpdateBody',
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
      const body = request.body as CustomerUpdateBody;

      let customer = await database.customers.findOne({ _id: customerId });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      customer.email = body.email;
      customer.name = body.name;
      customer.addressLine1 = body.addressLine1;
      customer.addressLine2 = body.addressLine2;
      customer.city = body.city;
      customer.country = body.country;
      customer.zipCode = body.zipCode;

      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      customer = await paymentProvider.updateCustomer(customer);

      await database.em.persistAndFlush(customer);

      await reply.send(customer);
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
