import fastifyFormBody from '@fastify/formbody';
import fastifyHelmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifyView from '@fastify/view';
import fastify, { FastifyInstance } from 'fastify';
import Handlebars from 'handlebars';
import path from 'path';

import { config } from '~/config';
import { database } from '~/database';
import { Invoice } from '~/entities';
import { Currency } from '~/entities/payment';
import { formatDate } from '~/lib/dayjs';

import { customerEndpoints } from './endpoints/customer';
import { invoiceEndpoints } from './endpoints/invoice';
import { paymentEndpoints } from './endpoints/payment';
import { projectEndpoints } from './endpoints/project';
import { subscriptionEndpoints } from './endpoints/subscription';
import { addSchemas } from './schema';

export async function init(): Promise<FastifyInstance> {
  const server = fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
    },
  });

  server.addHook('onRequest', async (request, reply) => {
    if (!request.routerPath) {
      await reply.code(404).send({
        error: 'Not found',
      });
      return reply;
    }

    // skip requests to our docs
    if (request.routerPath?.startsWith('/documentation')) {
      return;
    }

    if (request.routerPath?.startsWith('/static')) {
      return;
    }

    if (request.routerPath === '/payment/webhook/:projectId') {
      return;
    }

    const apiToken =
      (request.headers?.authorization || '').replace('Bearer ', '') || (request.query as { token: string }).token;
    if (!apiToken) {
      await reply.code(401).send({ error: 'Missing api token' });
      return reply;
    }

    if (request.routerPath?.startsWith('/project')) {
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

  await server.register(fastifyFormBody);

  await server.register(fastifyHelmet);

  await server.register(fastifyView, {
    engine: {
      handlebars: Handlebars,
    },
  });

  await server.register(fastifyStatic, {
    root:
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, 'public')
        : path.join(__dirname, '..', '..', 'public'),
    prefix: '/static',
  });

  Handlebars.registerHelper('formatDate', (date: Date, format: string) => formatDate(date, format));
  Handlebars.registerHelper('amountToPrice', (amount: number, currency: Currency) =>
    Invoice.amountToPrice(amount, currency),
  );

  await server.register(fastifySwagger, {
    routePrefix: '/documentation',
    swagger: {
      info: {
        title: 'Gringotts api',
        description: 'Documentation for the Gringotts api',
        version: '0.1.0',
      },
      host: 'localhost:3000',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      securityDefinitions: {
        authorization: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
        },
      },
      security: [{ authorization: [] }],
    },
    refResolver: {
      buildLocalReference(json) {
        if (!json.title && json.$id) {
          json.title = json.$id;
        }
        return json.$id as string;
      },
    },
    exposeRoute: true,
  });

  addSchemas(server);

  subscriptionEndpoints(server);
  customerEndpoints(server);
  invoiceEndpoints(server);
  paymentEndpoints(server);
  projectEndpoints(server);

  return server;
}
