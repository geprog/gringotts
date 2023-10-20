import { FastifyInstance } from 'fastify';

import { config } from '~/config';
import { database } from '~/database';

import { customerEndpoints } from './customer';
import { invoiceEndpoints } from './invoice';
import { mockedCheckoutEndpoints } from './mocked_checkout';
import { paymentEndpoints } from './payment';
import { paymentMethodEndpoints } from './payment_method';
import { projectEndpoints } from './project';
import { subscriptionEndpoints } from './subscription';

export async function apiEndpoints(server: FastifyInstance): Promise<void> {
  server.addHook('onRequest', async (request, reply) => {
    // skip nuxt api routes
    if (request.url === '/api/auth/login' || request.url === '/api/auth/logout' || request.url === '/api/user') {
      return;
    }

    if (request.routerPath === '/api/invoice/download') {
      return;
    }

    if (request.routerPath === '/api/payment/webhook/:projectId') {
      return;
    }

    if (request.routerPath === '/api/mocked/checkout/:paymentId') {
      return;
    }

    const apiToken =
      (request.headers?.authorization || '').replace('Bearer ', '') || (request.query as { token: string }).token;
    if (!apiToken) {
      await reply.code(401).send({ error: 'Missing api token' });
      return reply;
    }

    if (request.routerPath?.startsWith('/api/project') && request.url !== '/api/project/token-project') {
      if (apiToken === config.adminToken) {
        request.admin = true;
        return;
      }

      await reply.code(401).send({ error: 'You need to have admin access' });
      return reply;
    }

    const project = await database.projects.findOne({ apiToken }, { populate: ['invoiceData'] });
    if (!project) {
      await reply.code(401).send({ error: 'Invalid api token' });
      return reply;
    }

    request.project = project;
  });

  await server.register(subscriptionEndpoints);
  await server.register(customerEndpoints);
  await server.register(invoiceEndpoints);
  await server.register(paymentEndpoints);
  await server.register(projectEndpoints);
  await server.register(paymentMethodEndpoints);
  await server.register(mockedCheckoutEndpoints);
}
