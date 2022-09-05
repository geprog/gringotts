import { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { Invoice } from '~/entities';
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

      let invoice: Invoice;
      if (payment.isRecurring) {
        const _invoice = await database.invoices.findOne({ payment }, { populate: ['subscription'] });
        if (!_invoice) {
          throw new Error('Payment has no invoice');
        }
        invoice = _invoice;
      } else {
        invoice = await database.invoices.findOneOrFail({ subscription });
      }

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (payload.paymentStatus === 'paid') {
        subscription.lastPayment = payload.paidAt;
        payment.status = 'paid';

        if (payment.isRecurring) {
          invoice.status = 'paid';
        }
      }

      await database.em.persistAndFlush([payment, invoice, subscription]);

      // TODO: fix token
      const token = server.jwt.sign({ subscriptionId: subscription._id }, { expiresIn: '12h' });
      void triggerWebhook({
        body: {
          subscriptionId: subscription._id,
        },
        token,
      });

      await reply.send({ ok: true });
    },
  });
}
