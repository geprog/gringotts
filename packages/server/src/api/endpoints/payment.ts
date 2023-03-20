import { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { getPaymentProvider } from '~/payment_providers';
import { triggerWebhook } from '~/webhook';

export function paymentEndpoints(server: FastifyInstance): void {
  server.post('/payment/webhook/:projectId', {
    schema: { hide: true },
    handler: async (request, reply) => {
      const params = request.params as { projectId?: string };
      if (!params.projectId) {
        return reply.code(400).send({ error: 'ProjectId not provided' });
      }

      const project = await database.projects.findOne(params?.projectId);
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      const paymentProvider = getPaymentProvider(project);
      if (!paymentProvider) {
        return reply.code(500).send({ error: 'Unable to detect PaymentProvider' });
      }

      const payload = await paymentProvider.parsePaymentWebhook(request.body);
      if (!payload) {
        return reply.code(500).send({
          error: 'Payment provider not configured or payload parsing failed',
        });
      }

      const payment = await database.payments.findOne(
        { _id: payload.paymentId },
        { populate: ['subscription', 'customer', 'invoice'] },
      );
      if (!payment) {
        return reply.code(404).send({ error: 'Payment not found' });
      }

      if (payload.paymentStatus === 'paid' || payload.paymentStatus === 'failed') {
        payment.status = payload.paymentStatus;
        await database.em.persistAndFlush([payment]);
      }

      if (payment.type === 'verification' && payload.paymentStatus === 'paid') {
        const paymentMethod = await paymentProvider.getPaymentMethod(payload.paymentId);
        if (!paymentMethod) {
          return reply.code(500).send({ error: 'Payment method not found' });
        }
        paymentMethod.customer = payment.customer;

        const { customer } = payment;
        customer.activePaymentMethod = paymentMethod; // auto-activate new payment method
        customer.balance = Math.max(customer.balance + payment.amount, 0);
        await database.em.persistAndFlush([customer, paymentMethod]);
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
      }

      const { invoice } = payment;
      if (invoice && (payload.paymentStatus === 'paid' || payload.paymentStatus === 'failed')) {
        invoice.status = payload.paymentStatus;
        await database.em.persistAndFlush([invoice]);
      }

      await reply.send({ ok: true });
    },
  });
}
