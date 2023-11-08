import { FastifyInstance } from 'fastify';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';

import { getProjectFromRequest } from '~/api/helpers';
import { config } from '~/config';
import { database } from '~/database';
import { Invoice } from '~/entities';

// eslint-disable-next-line @typescript-eslint/require-await
export async function invoiceEndpoints(server: FastifyInstance): Promise<void> {
  server.get('/invoice', {
    schema: {
      operationId: 'listInvoices',
      summary: 'List invoices',
      tags: ['invoice'],
      response: {
        200: {
          type: 'array',
          items: {
            $ref: 'Invoice',
          },
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const invoices = await database.invoices.find({ project }, { populate: ['items', 'customer'] });

      await reply.send(invoices.map((i) => i.toJSON()));
    },
  });

  server.get('/invoice/:invoiceId', {
    schema: {
      operationId: 'getInvoice',
      summary: 'Get an invoice',
      tags: ['invoice'],
      params: {
        type: 'object',
        required: ['invoiceId'],
        additionalProperties: false,
        properties: {
          invoiceId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'Invoice',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { invoiceId } = request.params as { invoiceId: string };
      if (!invoiceId) {
        return reply.code(400).send({ error: 'Missing invoiceId' });
      }

      const invoice = await database.invoices.findOne({ _id: invoiceId, project }, { populate: ['items', 'customer'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      await reply.send(invoice.toJSON());
    },
  });

  server.patch('/invoice/:invoiceId', {
    schema: {
      operationId: 'patchInvoice',
      summary: 'Patch an invoice',
      tags: ['invoice'],
      params: {
        type: 'object',
        required: ['invoiceId'],
        additionalProperties: false,
        properties: {
          invoiceId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        additionalProperties: false,
        properties: {
          status: { type: 'string' },
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

      const { invoiceId } = request.params as { invoiceId: string };
      if (!invoiceId) {
        return reply.code(400).send({ error: 'Missing invoiceId' });
      }

      const invoice = await database.invoices.findOne({ _id: invoiceId, project }, { populate: ['items', 'customer'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid' || invoice.status === 'failed') {
        return reply.code(400).send({ error: "Invoice is already paid or failed and can't be changed anymore" });
      }

      const body = request.body as {
        status?: Invoice['status'];
      };

      invoice.status = body.status ?? invoice.status;

      await database.em.persistAndFlush(invoice);

      await reply.send({ ok: true });
    },
  });

  server.get(
    '/invoice/:invoiceId/html',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { invoiceId } = request.params as { invoiceId: string };
      if (!invoiceId) {
        return reply.code(400).send({ error: 'Missing invoiceId' });
      }

      const invoice = await database.invoices.findOne(
        { _id: invoiceId, project },
        { populate: ['items', 'subscription', 'customer'] },
      );
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      await reply.view(path.join('templates', 'invoice.hbs'), {
        invoice: invoice.toJSON(),
        project,
        customer: invoice.customer,
      });
    },
  );

  server.get(
    '/invoice/:invoiceId/generate-download-link',
    {
      schema: {
        operationId: 'generateInvoiceDownloadLink',
        summary: 'Generate a download link for an invoice',
        tags: ['invoice'],
        params: {
          type: 'object',
          required: ['invoiceId'],
          additionalProperties: false,
          properties: {
            invoiceId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            required: ['url'],
            additionalProperties: false,
            properties: {
              url: { type: 'string' },
            },
          },
          400: {
            $ref: 'ErrorResponse',
          },
          404: {
            $ref: 'ErrorResponse',
          },
        },
      },
    },
    async (request, reply) => {
      const project = await getProjectFromRequest(request);

      const { invoiceId } = request.params as { invoiceId: string };
      if (!invoiceId) {
        return reply.code(400).send({ error: 'Missing invoiceId' });
      }

      const invoice = await database.invoices.findOne({ _id: invoiceId, project }, { populate: ['items'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      // invoice date is in the future
      if (invoice.date > new Date()) {
        return reply.code(400).send({ error: 'Invoice is not ready yet' });
      }

      await invoice.generateInvoicePdf();

      const downloadToken = jwt.sign({ invoiceId }, config.jwtSecret, { expiresIn: '1d' });
      return reply.send({
        url: `${config.publicUrl}/api/invoice/download?token=${downloadToken}`,
      });
    },
  );

  server.get(
    '/invoice/download',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      const { token } = request.query as { token?: string };
      if (!token) {
        return reply.code(400).send({ error: 'Missing token' });
      }

      let invoiceId: string;
      try {
        const decoded = jwt.verify(token, config.jwtSecret) as { invoiceId?: string };
        if (!decoded.invoiceId) {
          return reply.code(400).send({ error: 'Invalid token' });
        }
        invoiceId = decoded.invoiceId;
      } catch (error) {
        return reply.code(400).send({ error: 'Invalid token' });
      }

      const invoice = await database.invoices.findOne({ _id: invoiceId }, { populate: ['items'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      const downloadPath = path.join(config.dataPath, 'invoices', invoice.getInvoicePath());
      if (!fs.existsSync(downloadPath)) {
        return reply.code(404).send({ error: 'Invoice PDF file not found' });
      }

      return reply.sendFile(path.basename(downloadPath), path.dirname(downloadPath));
    },
  );
}
