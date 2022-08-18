import { FastifyInstance } from 'fastify';
import path from 'path';

import { database } from '~/database';

export function invoiceEndpoints(server: FastifyInstance): void {
  server.get('/invoice/:invoiceId', {
    schema: {
      tags: ['invoice'],
      params: {
        type: 'object',
        required: ['invoiceId'],
        additionalProperties: false,
        properties: {
          invoiceId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'Invoice',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const { invoiceId } = request.params as { invoiceId: string };
      if (!invoiceId) {
        return reply.code(400).send({ error: 'Missing invoiceId' });
      }

      const invoice = await database.invoices.findOne({ _id: invoiceId }, { populate: ['items'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      await reply.send(invoice);
    },
  });

  server.get('/invoice/:invoiceId/html', async (request, reply) => {
    const { invoiceId } = request.params as { invoiceId: string };
    if (!invoiceId) {
      return reply.code(400).send({ error: 'Missing invoiceId' });
    }

    const invoice = await database.invoices.findOne({ _id: invoiceId }, { populate: ['items'] });
    if (!invoice) {
      return reply.code(404).send({ error: 'Invoice not found' });
    }

    const subscription = invoice.subscription;
    if (!subscription) {
      return reply.code(404).send({ error: 'Subscription not found' });
    }

    const customer = subscription.customer;
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    await reply.view(path.join('templates', 'invoice.hbs'), { invoice, customer });
  });
}
