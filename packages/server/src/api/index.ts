import fastifyFormBody from '@fastify/formbody';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifyView from '@fastify/view';
import fastify, { FastifyInstance } from 'fastify';
import Handlebars from 'handlebars';
import path from 'path';

import { config } from '~/config';
import { Invoice } from '~/entities';
import { Currency } from '~/entities/payment';
import { formatDate } from '~/lib/dayjs';

import { customerEndpoints } from './endpoints/customer';
import { invoiceEndpoints } from './endpoints/invoice';
import { paymentEndpoints } from './endpoints/payment';
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

  await server.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  server.addHook('onRequest', async (request, reply) => {
    if (!request.routerPath) {
      await reply.code(404).send({
        error: 'Not found',
      });
      return;
    }

    // skip requests to our docs
    if (request.routerPath?.startsWith('/documentation')) {
      return;
    }

    if (request.routerPath === '/payment/webhook') {
      return;
    }

    if (request.routerPath === '/invoice/:invoiceId/html') {
      return;
    }

    if (request.routerPath?.startsWith('/static')) {
      return;
    }

    try {
      await request.jwtVerify();
    } catch (err) {
      await reply.send(err);
    }
  });

  await server.register(fastifyFormBody);

  await server.register(fastifyHelmet);

  await server.register(fastifyView, {
    engine: {
      handlebars: Handlebars,
    },
  });

  await server.register(fastifyStatic, {
    root: path.join(__dirname, '..', '..', 'public'),
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

  return server;
}
