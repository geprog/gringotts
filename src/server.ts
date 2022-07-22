import fastify, { FastifyInstance } from 'fastify';

import { database } from '~/database';
import { paymentProvider } from '~/providers';
import { Subscription } from '~/types/subscription';

export function init(): FastifyInstance {
  const server = fastify();

  server.post('/subscription/start', async (request, reply) => {
    const body = request.body as Partial<{
      objectId: string;
      pricePerUnit: number;
      units: number;
      redirectUrl: string;
    }>;
    if (!body.objectId || !body.pricePerUnit || !body.units || !body.redirectUrl) {
      return reply.code(400).send({
        error: 'Missing required parameters',
      });
    }

    if (body.units < 1 || body.pricePerUnit <= 0) {
      return reply.code(400).send({
        error: 'Units must be greater than 0',
      });
    }

    // const plan = await database.getPlan(body.pricePerUnit);
    // if (!plan) {
    //   return reply.callNotFound();
    // }

    const now = new Date();

    const subscription = new Subscription({
      objectId: body.objectId,
      anchorDate: now,
      startDateOfPaymentCycle: now,
    });

    const { checkoutUrl, subscription: _subscription } = await paymentProvider.startSubscription({
      subscription,
      pricePerUnit: body.pricePerUnit,
      units: body.units,
      redirectUrl: body.redirectUrl,
    });

    subscription.changePlan(body.pricePerUnit, body.units, now);
    await database.putSubscription(_subscription);

    await reply.send({
      subscriptionId: _subscription._id,
      checkoutUrl,
    });
  });

  server.post('/subscription/:subscriptionId/change', async (request, reply) => {
    const { plan: _plan, units } = request.body as Partial<{ plan: string; units: number }>;
    if (!_plan || !units) {
      return reply.code(400).send({
        error: 'Missing required parameters',
      });
    }

    const plan = await database.getPlan(_plan);
    if (!plan) {
      return reply.callNotFound();
    }

    if (units < 1) {
      return reply.send({ error: 'Units must be greater than 0' }).code(400);
    }

    const { subscriptionId } = request.params as { subscriptionId: string };
    const subscription = await database.getSubscription(subscriptionId);
    if (!subscription) {
      return reply.callNotFound();
    }

    subscription.changePlan(plan.pricePerUnit, units, new Date());
    await database.putSubscription(subscription);

    await reply.send({ ok: true });
  });

  server.post('/subscription/:subscriptionId/end', async (request, reply) => {
    const { subscriptionId } = request.params as Partial<{ subscriptionId: string }>;
    if (!subscriptionId) {
      return reply.code(400).send({
        error: 'Missing required parameters',
      });
    }

    const subscription = await database.getSubscription(subscriptionId);
    if (!subscription) {
      return reply.callNotFound();
    }

    // TODO: end subscription
    await database.putSubscription(subscription);

    await reply.send({ ok: true });
  });

  server.get('/subscription/:subscriptionId/invoice', async (request, reply) => {
    const { subscriptionId } = request.params as Partial<{ subscriptionId: string }>;
    if (!subscriptionId) {
      return reply.code(400).send({
        error: 'Missing required parameters',
      });
    }

    const subscription = await database.getSubscription(subscriptionId);
    if (!subscription) {
      return reply.callNotFound();
    }

    const invoice = subscription.getPeriod(new Date()).getInvoice();

    await reply.send(invoice.toString());
  });

  server.get('/payment/webhook', async (request, reply) => {
    // TODO: notify backend
    console.log(request.body);
    reply.callNotFound();
  });

  return server;
}

export const server = init();
