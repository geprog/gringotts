import { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { Payment, Subscription } from '~/entities';
import { Invoice } from '~/entities/invoice';
import { InvoiceItem } from '~/entities/invoice_item';
import dayjs from '~/lib/dayjs';
import { getPaymentProvider } from '~/payment_providers';
import { getPeriodFromAnchorDate } from '~/utils';

export function subscriptionEndpoints(server: FastifyInstance): void {
  server.post('/subscription/start', {
    schema: {
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

      const customer = await database.customers.findOne({ _id: body.customerId }, { populate: ['subscriptions'] });
      if (!customer) {
        return reply.code(404).send({
          error: 'Customer not found',
        });
      }

      const now = new Date();

      const subscription = new Subscription({
        anchorDate: now,
        customer,
      });

      const period = getPeriodFromAnchorDate(now, subscription.anchorDate);

      subscription.changePlan({ units: body.units, pricePerUnit: body.pricePerUnit });

      const paymentProvider = getPaymentProvider();
      if (!paymentProvider) {
        return reply.code(500).send({
          error: 'Payment provider not configured',
        });
      }

      const payment = new Payment({
        price: 1.0, // TODO: change first payment price based on currency
        currency: 'EUR', // TODO: allow to change currency
        status: 'pending',
      });

      const invoice = new Invoice({
        start: period.start,
        end: period.end,
      });

      invoice.items.add(
        new InvoiceItem({
          description: 'Payment verification',
          pricePerUnit: payment.price,
          units: 1,
        }),
      );

      const { checkoutUrl } = await paymentProvider.startSubscription({
        subscription,
        payment,
        redirectUrl: body.redirectUrl,
      });

      customer.subscriptions.add(subscription);

      await database.em.persistAndFlush([customer, subscription, invoice, payment]);

      await reply.send({
        subscriptionId: subscription._id,
        checkoutUrl,
      });
    },
  });

  server.patch('/subscription/:subscriptionId', {
    schema: {
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
      const { subscriptionId } = request.params as { subscriptionId: string };

      const subscription = await database.subscriptions.findOne(
        { _id: subscriptionId },
        { populate: ['customer', 'changes'] },
      );
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      await reply.send(subscription);
    },
  });

  server.get('/subscription/:subscriptionId/invoice', {
    schema: {
      tags: ['subscription'],
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
}
