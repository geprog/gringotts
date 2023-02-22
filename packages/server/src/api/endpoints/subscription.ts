import { FastifyInstance } from 'fastify';

import { getProjectFromRequest } from '~/api/helpers';
import { database } from '~/database';
import { Payment, Subscription } from '~/entities';
import { Invoice } from '~/entities/invoice';
import { InvoiceItem } from '~/entities/invoice_item';
import { getPaymentProvider } from '~/payment_providers';
import { getActiveUntilDate } from '~/utils';

export function subscriptionEndpoints(server: FastifyInstance): void {
  server.post('/subscription', {
    schema: {
      summary: 'Create a subscription',
      tags: ['subscription'],
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
      const project = await getProjectFromRequest(request);

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

      const customer = await database.customers.findOne(
        { _id: body.customerId, project },
        { populate: ['subscriptions'] },
      );
      if (!customer) {
        return reply.code(404).send({
          error: 'Customer not found',
        });
      }

      const now = new Date();

      const subscription = new Subscription({
        anchorDate: now,
        customer,
        project,
      });

      subscription.changePlan({ units: body.units, pricePerUnit: body.pricePerUnit });

      const paymentProvider = getPaymentProvider(project);
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      customer.invoiceCounter += 1;

      const invoice = new Invoice({
        date: now,
        sequentialId: customer.invoiceCounter,
        status: 'draft',
        subscription,
        currency: 'EUR', // TODO: allow to change currency
        vatRate: 0, // Set to 0 as payment verification is not a real invoice
        project,
      });

      invoice.items.add(
        new InvoiceItem({
          description: 'Payment verification', // TODO: allow to configure text
          pricePerUnit: 1.0, // TODO: change first payment price based on currency
          units: 1,
          invoice,
        }),
      );

      const amount = Invoice.roundPrice(invoice.totalAmount);

      const payment = new Payment({
        amount,
        status: 'pending',
        customer,
        description: 'Payment verification', // TODO: allow to set description
        subscription,
        currency: invoice.currency,
      });

      invoice.payment = payment;

      const { checkoutUrl } = await paymentProvider.startSubscription({
        project,
        subscription,
        payment,
        redirectUrl: body.redirectUrl,
      });

      // TODO: do we need this?
      // customer.subscriptions.add(subscription);

      await database.em.persistAndFlush([customer, subscription, invoice, payment]);

      await reply.send({
        subscriptionId: subscription._id,
        checkoutUrl,
      });
    },
  });

  server.patch('/subscription/:subscriptionId', {
    schema: {
      summary: 'Patch a subscription',
      tags: ['subscription'],
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
      const project = await getProjectFromRequest(request);

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
        { _id: subscriptionId, project },
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
      summary: 'Get a subscription',
      tags: ['subscription'],
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
      const project = await getProjectFromRequest(request);

      const { subscriptionId } = request.params as { subscriptionId: string };

      const subscription = await database.subscriptions.findOne(
        { _id: subscriptionId, project },
        { populate: ['customer', 'changes'] },
      );
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      const activeUntil = subscription.lastPayment
        ? getActiveUntilDate(subscription.lastPayment, subscription.anchorDate)
        : undefined;

      const _subscription = {
        ...subscription.toJSON(),
        activeUntil,
      };

      await reply.send(_subscription);
    },
  });

  server.get('/subscription/:subscriptionId/invoice', {
    schema: {
      summary: 'List all invoices of a subscription',
      tags: ['subscription', 'invoice'],
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

      const { subscriptionId } = request.params as { subscriptionId: string };

      const subscription = await database.subscriptions.findOne({ _id: subscriptionId, project });
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      const invoices = await database.invoices.find({ subscription, project }, { populate: ['items'] });

      await reply.send(invoices.map((invoice) => invoice.toJSON()));
    },
  });
}
