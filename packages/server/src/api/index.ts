import cors from '@fastify/cors';
import fastifyFormBody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifyView from '@fastify/view';
import fastify, { FastifyInstance } from 'fastify';
import Handlebars from 'handlebars';
import { createProxyServer } from 'httpxy';
import path from 'path';
import pino from 'pino';

import { config } from '~/config';
import { Invoice } from '~/entities';
import { Currency } from '~/entities/payment';
import { formatDate } from '~/lib/dayjs';
import { log } from '~/log';

import { apiEndpoints } from './endpoints';
import { addSchemas } from './schema';

// routing priority:
// api routes -> static files -> nuxt -> 404

export async function init(): Promise<FastifyInstance> {
  const logger =
    process.env.NODE_ENV === 'test'
      ? pino(
          {},
          {
            // eslint-disable-next-line no-console
            write: (data: string) => console.log(data),
          },
        )
      : log;

  const server = fastify({
    logger,
    disableRequestLogging: process.env.NODE_ENV === 'production',
  });

  await server.register(cors, {
    origin: '*',
  });

  await server.register(fastifyFormBody);

  await server.register(fastifyStatic, {
    root:
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, 'public')
        : path.join(__dirname, '..', '..', 'public'),
    prefix: '/static/',
  });

  const proxy = createProxyServer({});

  server.setNotFoundHandler(async (request, reply) => {
    if (
      request.url?.startsWith('/api') &&
      request.url !== '/api/auth/login' &&
      request.url !== '/api/auth/logout' &&
      request.url !== '/api/user'
    ) {
      await reply.code(404).send({
        error: 'Not found',
      });
      return;
    }

    // forward to nuxt
    try {
      await proxy.web(request.raw, reply.raw, {
        target: 'http://localhost:3000/', // TODO: allow to configure
      });
    } catch (error) {
      await reply.code(500).send({
        error: 'Proxy error' + (error as Error).toString(),
      });
    }
  });

  await server.register(fastifyView, {
    engine: {
      handlebars: Handlebars,
    },
  });

  Handlebars.registerHelper('formatDate', (date: Date, format: string) => formatDate(date, format));
  Handlebars.registerHelper('amountToPrice', (amount: number, currency: Currency) =>
    Invoice.amountToPrice(amount, currency),
  );

  await server.register(fastifySwagger, {
    routePrefix: '/docs',
    swagger: {
      info: {
        title: 'Gringotts api',
        description: 'Documentation for the Gringotts api',
        version: '0.1.0',
      },
      host: `localhost:${config.port}`,
      basePath: '/api',
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

  await server.register(apiEndpoints, { prefix: '/api' });

  return server;
}
