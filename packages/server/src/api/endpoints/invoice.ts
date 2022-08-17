import { FastifyInstance } from 'fastify';

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

      const invoice = await database.invoices.findOne({ _id: invoiceId }, { populate: ['items'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      await reply.send(invoice);
    },
  });
}
