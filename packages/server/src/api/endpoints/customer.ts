import { FastifyInstance } from 'fastify';

import { getProjectFromRequest } from '~/api/helpers';
import { database } from '~/database';
import { Customer, Project } from '~/entities';
import { getPaymentProvider } from '~/payment_providers';
import { getActiveUntilDate } from '~/utils';

// eslint-disable-next-line @typescript-eslint/require-await
export async function customerEndpoints(server: FastifyInstance): Promise<void> {
  type CustomerUpdateBody = Pick<
    Customer,
    'addressLine1' | 'addressLine2' | 'city' | 'country' | 'email' | 'name' | 'zipCode' | 'activePaymentMethod'
  >;

  server.addSchema({
    $id: 'CustomerUpdateBody',
    type: 'object',
    additionalProperties: false,
    properties: {
      email: { type: 'string' },
      name: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string' },
      zipCode: { type: 'string' },
      city: { type: 'string' },
      country: { type: 'string' },
      activePaymentMethod: { $ref: 'PaymentMethod' },
    },
  });

  server.post('/customer', {
    schema: {
      operationId: 'createCustomer',
      summary: 'Create a customer',
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
      const project = await getProjectFromRequest(request);

      const body = request.body as CustomerUpdateBody;

      if (!body.email) {
        return reply.code(400).send({ error: 'Email is required' });
      }

      if (!body.name) {
        return reply.code(400).send({ error: 'Name is required' });
      }

      let customer = new Customer({
        email: body.email,
        name: body.name,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        country: body.country,
        zipCode: body.zipCode,
        project,
      });

      const paymentProvider = getPaymentProvider(project);
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
      operationId: 'listCustomers',
      summary: 'List all customers or search by email',
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
      const project = await getProjectFromRequest(request);

      const { email } = request.query as Partial<{ email?: string }>;

      const query = { project } as { project: Project; email: string };
      if (email) {
        query.email = email;
      }

      const customers = await database.customers.find(query);

      await reply.send(customers);
    },
  });

  server.get('/customer/:customerId', {
    schema: {
      operationId: 'getCustomer',
      summary: 'Get a customer',
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
          $ref: 'Customer',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { customerId } = request.params as { customerId: string };

      const customer = await database.customers.findOne(
        { _id: customerId, project },
        { populate: ['activePaymentMethod'] },
      );
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      await reply.send(customer);
    },
  });

  server.patch('/customer/:customerId', {
    schema: {
      operationId: 'patchCustomer',
      summary: 'Patch a customer',
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
      const project = await getProjectFromRequest(request);

      const { customerId } = request.params as { customerId: string };
      const body = request.body as CustomerUpdateBody;

      let customer = await database.customers.findOne({ _id: customerId, project });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      customer.email = body.email || customer.email;
      customer.name = body.name || customer.name;
      customer.addressLine1 = body.addressLine1 || customer.addressLine1;
      customer.addressLine2 = body.addressLine2 || customer.addressLine2;
      customer.city = body.city || customer.city;
      customer.country = body.country || customer.country;
      customer.zipCode = body.zipCode || customer.zipCode;

      if (body.activePaymentMethod?._id) {
        const paymentMethod = await database.paymentMethods.findOne({
          _id: body.activePaymentMethod._id,
          customer,
        });
        if (!paymentMethod) {
          return reply.code(404).send({ error: 'Payment method not found' });
        }
        customer.activePaymentMethod = paymentMethod;
      }

      const paymentProvider = getPaymentProvider(project);
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
      operationId: 'deleteCustomer',
      summary: 'Delete a customer',
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
      const project = await getProjectFromRequest(request);

      const { customerId } = request.params as { customerId: string };

      const customer = await database.customers.findOne({ _id: customerId, project });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      const paymentProvider = getPaymentProvider(project);
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

  server.get('/customer/:customerId/subscription', {
    schema: {
      operationId: 'listCustomerSubscriptions',
      summary: 'List all subscriptions of a customer',
      tags: ['subscription', 'customer'],
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
            $ref: 'Subscription',
          },
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { customerId } = request.params as { customerId: string };

      const customer = await database.customers.findOne({ _id: customerId, project });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      const subscriptions = await database.subscriptions.find({ project, customer }, { populate: ['changes'] });

      const _subscriptions = subscriptions.map((subscription) => {
        const activeUntil = subscription.lastPayment
          ? getActiveUntilDate(subscription.lastPayment, subscription.anchorDate)
          : undefined;

        return {
          ...subscription.toJSON(),
          activeUntil,
        };
      });

      await reply.send(_subscriptions);
    },
  });

  server.get('/customer/:customerId/invoice', {
    schema: {
      operationId: 'listCustomerInvoices',
      summary: 'List all invoices of a customer',
      tags: ['invoice', 'customer'],
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
            $ref: 'Invoice',
          },
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { customerId } = request.params as { customerId: string };

      const customer = await database.customers.findOne({ _id: customerId, project });
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      const invoices = await database.invoices.find({ project, customer }, { populate: ['items'] });

      await reply.send(invoices.map((invoice) => invoice.toJSON()));
    },
  });
}
