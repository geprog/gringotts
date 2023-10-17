import fetch from 'cross-fetch';
import { FastifyInstance } from 'fastify';
import NodeFormData from 'form-data';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import stream from 'stream/promises';

import { getProjectFromRequest } from '~/api/helpers';
import { config } from '~/config';
import { database } from '~/database';
import { Invoice, Project } from '~/entities';

async function generateInvoicePdf(invoice: Invoice, project: Project) {
  const fileName = path.join(project._id, `invoice-${invoice._id}.pdf`);
  const filePath = path.join(config.dataPath, 'invoices', fileName);

  if (fs.existsSync(filePath)) {
    invoice.file = fileName;
    return invoice;
  }

  const formData = new NodeFormData() as unknown as FormData;
  formData.append('url', `${config.publicUrl}/invoice/${invoice._id}/html?token=${project.apiToken}`);

  const response = await fetch(`${config.gotenbergUrl}/forms/chromium/convert/url`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok || !response.body) {
    throw new Error(`unexpected response ${response.statusText}`);
  }

  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  // cast as response.body is a ReadableStream from DOM and not NodeJS.ReadableStream
  const httpStream = response.body as unknown as NodeJS.ReadableStream;

  await stream.pipeline(httpStream, fs.createWriteStream(filePath));

  invoice.file = fileName;

  await database.em.persistAndFlush(invoice);

  return invoice;
}

export function invoiceEndpoints(server: FastifyInstance): void {
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

      const invoices = await database.invoices.find({ project }, { populate: ['items'] });

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

      const invoice = await database.invoices.findOne({ _id: invoiceId, project }, { populate: ['items'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      await reply.send(invoice.toJSON());
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

      const invoice = await database.invoices.findOne({ _id: invoiceId, project }, { populate: ['items'] });
      if (!invoice) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      const subscription = await database.subscriptions.findOne(invoice.subscription);
      if (!subscription) {
        return reply.code(404).send({ error: 'Subscription not found' });
      }

      const customer = await database.customers.findOne(subscription.customer);
      if (!customer) {
        return reply.code(404).send({ error: 'Customer not found' });
      }

      await reply.view(path.join('templates', 'invoice.hbs'), { invoice: invoice.toJSON(), project, customer });
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

      await generateInvoicePdf(invoice, project);

      const downloadToken = jwt.sign({ invoiceId }, config.jwtSecret, { expiresIn: '1d' });
      return reply.send({
        url: `${config.publicUrl}/invoice/download?token=${downloadToken}`,
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
      if (!invoice || !invoice.file) {
        return reply.code(404).send({ error: 'Invoice not found' });
      }

      const downloadPath = path.join(config.dataPath, 'invoices', invoice.file);
      if (!fs.existsSync(downloadPath)) {
        return reply.code(404).send({ error: 'Invoice PDF file not found' });
      }

      return reply.sendFile(path.basename(downloadPath), path.dirname(downloadPath));
    },
  );
}
