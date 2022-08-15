import { FastifyInstance } from 'fastify';

export function invoiceEndpoints(server: FastifyInstance): void {
  server.get('/invoice', {
    schema: {
      tags: ['invoice'],
      querystring: {
        type: 'object',
        additionalProperties: false,
        properties: {
          // TODO
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
      await reply.send({ error: 'Not implemented' });
    },
  });
}
