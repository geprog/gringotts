import { FastifyInstance } from 'fastify';
import path from 'path';

import { database } from '~/database';

// eslint-disable-next-line @typescript-eslint/require-await
export async function mockedCheckoutEndpoints(server: FastifyInstance): Promise<void> {
  server.get(
    '/mocked/checkout/:paymentId',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      const params = request.params as { paymentId?: string };
      if (!params.paymentId) {
        return reply.code(400).send({
          error: 'Missing paymentId',
        });
      }

      const query = request.query as { redirect_url?: string };
      if (!query.redirect_url) {
        return reply.code(400).send({
          error: 'Missing redirect_url',
        });
      }

      const payment = await database.payments.findOne(
        { _id: params.paymentId },
        { populate: ['customer', 'customer.project'] },
      );
      if (!payment) {
        return reply.code(404).send({
          error: 'Payment not found',
        });
      }

      if (payment.customer.project.paymentProvider !== 'mocked') {
        return reply.code(404).send({
          error: 'Payment not found', // don't leak that we are in dev mode
        });
      }

      await reply.view(path.join('templates', 'mocked-checkout.hbs'), { payment, redirect_url: query.redirect_url });
    },
  );

  server.post('/mocked/checkout/:paymentId', {
    schema: {
      hide: true,
      summary: 'Do a checkout for a payment in development mode',
      tags: ['dev'],
      params: {
        type: 'object',
        required: ['paymentId'],
        additionalProperties: false,
        properties: {
          paymentId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['status', 'redirect_url'],
        additionalProperties: false,
        properties: {
          status: { type: 'string' },
          redirect_url: { type: 'string' },
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
      const params = request.params as { paymentId?: string };
      if (!params.paymentId) {
        return reply.code(400).send({
          error: 'Missing paymentId',
        });
      }

      const body = request.body as { redirect_url?: string; status?: 'paid' | 'failed' };
      if (!body.redirect_url) {
        return reply.code(400).send({
          error: 'Missing redirect_url',
        });
      }
      if (!body.status) {
        return reply.code(400).send({
          error: 'Missing status',
        });
      }

      const payment = await database.payments.findOne(
        { _id: params.paymentId },
        { populate: ['customer', 'customer.project'] },
      );
      if (!payment) {
        return reply.code(404).send({
          error: 'Payment not found',
        });
      }

      if (payment.customer.project.paymentProvider !== 'mocked') {
        return reply.code(404).send({
          error: 'Payment not found', // don't leak that we are in dev mode
        });
      }

      const { project } = payment.customer;

      const response = await server.inject({
        method: 'POST',
        headers: {
          authorization: `Bearer ${project.apiToken}`,
        },
        url: `/api/payment/webhook/${project._id}`,
        payload: {
          paymentId: payment._id,
          paymentStatus: body.status,
          paidAt: new Date().toISOString(),
        },
      });

      if (response.statusCode !== 200) {
        return reply.view(path.join('templates', 'mocked-checkout.hbs'), {
          payment,
          redirect_url: body.redirect_url,
          error: 'Payment webhook failed',
        });
      }

      await reply.redirect(body.redirect_url);
    },
  });
}
