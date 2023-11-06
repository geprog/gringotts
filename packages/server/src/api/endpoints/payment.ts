import { FastifyInstance } from 'fastify';

import { getProjectFromRequest } from '~/api/helpers';
import { database } from '~/database';
import { getPaymentProvider } from '~/payment_providers';
import { triggerWebhook } from '~/webhook';

// eslint-disable-next-line @typescript-eslint/require-await
export async function paymentEndpoints(server: FastifyInstance): Promise<void> {
  server.get('/payment', {
    schema: {
      operationId: 'listPayments',
      summary: 'List payments',
      tags: ['payment'],
      response: {
        200: {
          type: 'array',
          items: {
            $ref: 'Payment',
          },
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const payments = await database.payments.find({ project }, { populate: ['customer', 'invoice', 'subscription'] });

      await reply.send(payments.map((i) => i.toJSON()));
    },
  });

  server.get('/payment/:paymentId', {
    schema: {
      operationId: 'getPayment',
      summary: 'Get a payment',
      tags: ['payment'],
      params: {
        type: 'object',
        required: ['paymentId'],
        additionalProperties: false,
        properties: {
          paymentId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'Payment',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { paymentId } = request.params as { paymentId: string };
      if (!paymentId) {
        return reply.code(400).send({ error: 'Missing paymentId' });
      }

      const payment = await database.payments.findOne(
        { _id: paymentId, project },
        { populate: ['customer', 'invoice'] },
      );
      if (!payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      await reply.send(payment.toJSON());
    },
  });

  server.post('/payment/webhook/:projectId', {
    schema: { hide: true },
    handler: async (request, reply) => {
      const params = request.params as { projectId?: string };
      if (!params.projectId) {
        return reply.code(400).send({ error: 'ProjectId not provided' });
      }

      const project = await database.projects.findOne(params?.projectId);
      if (!project) {
        server.log.error(
          {
            projectId: params?.projectId,
          },
          'Project not found',
        );
        return reply.code(404).send({ error: 'Project not found' });
      }

      const paymentProvider = getPaymentProvider(project);
      if (!paymentProvider) {
        server.log.error(
          {
            projectId: project._id,
            paymentProvider: project.paymentProvider,
          },
          'Unable to detect PaymentProvider',
        );
        return reply.code(500).send({ error: 'Unable to detect PaymentProvider' });
      }

      const payload = await paymentProvider.parsePaymentWebhook(request.body);
      if (!payload) {
        server.log.error(
          {
            projectId: project._id,
            body: request.body,
          },
          'Payment provider not configured or payload parsing failed',
        );
        return reply.code(500).send({
          error: 'Payment provider not configured or payload parsing failed',
        });
      }

      const payment = await database.payments.findOne(
        { _id: payload.paymentId },
        { populate: ['subscription', 'customer', 'invoice'] },
      );
      if (!payment) {
        server.log.error(
          {
            projectId: project._id,
            paymentId: payload.paymentId,
          },
          'Payment not found',
        );
        return reply.code(404).send({ error: 'Payment not found' });
      }

      if (payload.paymentStatus === 'paid' || payload.paymentStatus === 'failed') {
        payment.status = payload.paymentStatus;
        await database.em.persistAndFlush([payment]);
        server.log.debug(
          {
            projectId: project._id,
            paymentId: payload.paymentId,
            paymentStatus: payload.paymentStatus,
          },
          'Payment updated',
        );
      }

      if (payment.type === 'verification' && payload.paymentStatus === 'paid') {
        const paymentMethod = await paymentProvider.getPaymentMethod(request.body);
        if (!paymentMethod) {
          server.log.error(
            {
              projectId: project._id,
              paymentId: payload.paymentId,
              body: request.body,
            },
            'Payment method not found',
          );
          return reply.code(500).send({ error: 'Payment method not found' });
        }
        paymentMethod.project = project;
        paymentMethod.customer = payment.customer;

        const { customer } = payment;
        customer.activePaymentMethod = paymentMethod; // auto-activate new payment method
        customer.balance = Math.max(customer.balance + payment.amount, 0);
        await database.em.persistAndFlush([customer, paymentMethod]);
        server.log.debug(
          {
            projectId: project._id,
            paymentId: payload.paymentId,
            paymentMethodId: paymentMethod._id,
            customerId: customer._id,
          },
          'Payment method verified',
        );
      }

      const { subscription } = payment;
      if (subscription && payload.paymentStatus === 'paid') {
        subscription.lastPayment = payload.paidAt;
        await database.em.persistAndFlush([subscription]);
        void triggerWebhook({
          url: project.webhookUrl,
          body: {
            subscriptionId: subscription._id,
          },
        });
        server.log.debug(
          {
            projectId: project._id,
            paymentId: payload.paymentId,
            subscriptionId: subscription._id,
          },
          'Subscription last payment updated & webhook triggered',
        );
      }

      const { invoice } = payment;
      if (invoice && (payload.paymentStatus === 'paid' || payload.paymentStatus === 'failed')) {
        invoice.status = payload.paymentStatus;
        await database.em.persistAndFlush([invoice]);
        server.log.debug(
          {
            projectId: project._id,
            paymentId: payload.paymentId,
            invoiceId: invoice._id,
          },
          'Invoice status updated',
        );
      }

      await reply.send({ ok: true });
    },
  });
}
