import { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { parsePaymentWebhook } from '~/payment_providers';
import { triggerWebhook } from '~/webhook';

export function paymentEndpoints(server: FastifyInstance): void {
  server.post('/payment/webhook/:paymentProviderName', {
    schema: { hide: true },
    handler: async (request, reply) => {
      const { paymentProviderName } = request.params as { paymentProviderName: string };

      const payload = await parsePaymentWebhook(paymentProviderName, request.body);
      if (!payload) {
        return reply.code(500).send({
          error: 'Payment provider not configured or payload parsing failed',
        });
      }

      const payment = await database.payments.findOne({ _id: payload.paymentId }, { populate: ['subscription'] });
      if (!payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      const subscription = payment.subscription;

      const invoice = await database.invoices.findOneOrFail(payment.isRecurring ? { payment } : { subscription }, {
        populate: ['project'],
      });

      if (payload.paymentStatus === 'paid') {
        subscription.lastPayment = payload.paidAt;
        payment.status = 'paid';

        if (payment.isRecurring) {
          invoice.status = 'paid';
        }
      }

      await database.em.persistAndFlush([payment, invoice, subscription]);

      const project = invoice.project;

      void triggerWebhook({
        url: project.webhookUrl,
        body: {
          subscriptionId: subscription._id,
        },
      });

      await reply.send({ ok: true });
    },
  });
}
