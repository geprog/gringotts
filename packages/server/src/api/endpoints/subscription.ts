import { FastifyInstance } from 'fastify';

import { getProjectFromRequest } from '~/api/helpers';
import { database } from '~/database';
import { Subscription } from '~/entities';
import { getActiveUntilDate, getPeriodFromAnchorDate } from '~/utils';

export function subscriptionEndpoints(server: FastifyInstance): void {
  server.post('/subscription', {
    schema: {
      operationId: 'createSubscription',
      summary: 'Create a subscription',
      tags: ['subscription'],
      body: {
        type: 'object',
        required: ['pricePerUnit', 'units', 'customerId'],
        additionalProperties: false,
        properties: {
          pricePerUnit: { type: 'number' },
          units: { type: 'number' },
          customerId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'Subscription',
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
      const project = await getProjectFromRequest(request);

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

      const customer = await database.customers.findOne(
        { _id: body.customerId, project },
        { populate: ['subscriptions', 'activePaymentMethod'] },
      );
      if (!customer) {
        return reply.code(404).send({
          error: 'Customer not found',
        });
      }

      if (!customer.activePaymentMethod) {
        return reply.code(400).send({
          error: 'Customer has no active payment method',
        });
      }

      const now = new Date();

      const period = getPeriodFromAnchorDate(now, now);
      const subscription = new Subscription({
        anchorDate: now,
        status: 'active',
        nextPayment: period.end,
        customer,
        project,
      });

      subscription.changePlan({ units: body.units, pricePerUnit: body.pricePerUnit });

      await database.em.persistAndFlush([customer, subscription]);

      await reply.send(subscription.toJSON());
    },
  });

  server.get('/subscription', {
    schema: {
      operationId: 'listSubscriptions',
      summary: 'List all subscriptions',
      tags: ['subscription'],
      response: {
        200: {
          type: 'array',
          items: {
            $ref: 'Subscription',
          },
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const subscriptions = await database.subscriptions.find({ project }, { populate: ['customer', 'changes'] });

      const _subscriptions = subscriptions.map((subscription) => {
        const activeUntil = subscription.lastPayment
          ? getActiveUntilDate(subscription.lastPayment, subscription.anchorDate)
          : undefined;

        return {
          ...subscription.toJSON(),
          activeUntil,
        };
      });

      await reply.send(_subscriptions);
    },
  });

  server.patch('/subscription/:subscriptionId', {
    schema: {
      operationId: 'patchSubscription',
      summary: 'Patch a subscription',
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
      const project = await getProjectFromRequest(request);

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
        { _id: subscriptionId, project },
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
      operationId: 'getSubscription',
      summary: 'Get a subscription',
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
      const project = await getProjectFromRequest(request);

      const { subscriptionId } = request.params as { subscriptionId: string };

      const subscription = await database.subscriptions.findOne(
        { _id: subscriptionId, project },
        { populate: ['customer', 'changes'] },
      );
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      const activeUntil = subscription.lastPayment
        ? getActiveUntilDate(subscription.lastPayment, subscription.anchorDate)
        : undefined;

      const _subscription = {
        ...subscription.toJSON(),
        activeUntil,
      };

      await reply.send(_subscription);
    },
  });

  server.get('/subscription/:subscriptionId/invoice', {
    schema: {
      operationId: 'listSubscriptionInvoices',
      summary: 'List all invoices of a subscription',
      tags: ['subscription', 'invoice'],
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
      const project = await getProjectFromRequest(request);

      const { subscriptionId } = request.params as { subscriptionId: string };

      const subscription = await database.subscriptions.findOne({ _id: subscriptionId, project });
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      const invoices = await database.invoices.find({ subscription, project }, { populate: ['items'] });

      await reply.send(invoices.map((invoice) => invoice.toJSON()));
    },
  });
}
