import { FastifyInstance } from 'fastify';

import { getProjectFromRequest } from '~/api/helpers';
import { database } from '~/database';
import { Payment, Subscription } from '~/entities';
import { Invoice } from '~/entities/invoice';
import { InvoiceItem } from '~/entities/invoice_item';
import { getPaymentProvider } from '~/payment_providers';
import { getActiveUntilDate, getPeriodFromAnchorDate } from '~/utils';

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

      const period = getPeriodFromAnchorDate(now, subscription.anchorDate);

      subscription.changePlan({ units: body.units, pricePerUnit: body.pricePerUnit });

      const paymentProvider = getPaymentProvider(project);
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      const payment = new Payment({
        amount: 1.0, // TODO: change first payment price based on currency
        currency: 'EUR', // TODO: allow to change currency
        status: 'pending',
        customer,
        description: 'Subscription start', // TODO: allow to set description
        subscription,
      });

      customer.invoiceCounter += 1;

      const invoice = new Invoice({
        start: period.start,
        end: period.end,
        sequentialId: customer.invoiceCounter,
        status: 'draft',
        subscription,
        currency: payment.currency,
        vatRate: 19.0, // TODO: german vat rate => allow to configure
        payment,
        project,
      });

      invoice.items.add(
        new InvoiceItem({
          description: 'Subscription start (Payment verification)', // TODO: allow to configure text
          pricePerUnit: payment.amount,
          units: 1,
          invoice,
        }),
      );

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
        { populate: ['customer', 'changes', 'invoices'] },
      );
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      const activeUntil = subscription.lastPayment
        ? getActiveUntilDate(subscription.lastPayment, subscription.anchorDate)
        : undefined;

      const _subscription = {
        ...subscription,
        activeUntil,
        changes: subscription.changes.getItems().map((change) => ({ ...change, subscription: undefined })),
        invoices: subscription.invoices.getItems().map((invoice) => ({ ...invoice, subscription: undefined })),
      };

      await reply.send(_subscription);
    },
  });
}
