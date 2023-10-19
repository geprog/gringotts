import crypto from 'crypto';
import { FastifyInstance } from 'fastify';

import { getProjectFromRequest } from '~/api/helpers';
import { database } from '~/database';
import { Project, ProjectInvoiceData } from '~/entities';

async function generateApiToken(length = 32) {
  return new Promise<string>((resolve, reject) =>
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    crypto.randomBytes(length, (err, buffer) => {
      if (err) {
        return reject(err);
      }
      resolve(buffer.toString('hex'));
    }),
  );
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function projectEndpoints(server: FastifyInstance): Promise<void> {
  type ProjectInvoiceDataUpdateBody = Pick<
    ProjectInvoiceData,
    'addressLine1' | 'addressLine2' | 'city' | 'country' | 'email' | 'name' | 'zipCode' | 'logo'
  >;

  type ProjectUpdateBody = Pick<
    Project,
    'name' | 'mollieApiKey' | 'paymentProvider' | 'webhookUrl' | 'apiToken' | 'currency' | 'vatRate'
  > & {
    invoiceData?: ProjectInvoiceDataUpdateBody;
  };

  server.addSchema({
    $id: 'ProjectInvoiceDataUpdateBody',
    type: 'object',
    required: ['email', 'name', 'addressLine1', 'addressLine2', 'zipCode', 'city', 'country', 'logo'],
    additionalProperties: false,
    properties: {
      email: { type: 'string' },
      name: { type: 'string' },
      addressLine1: { type: 'string' },
      addressLine2: { type: 'string' },
      zipCode: { type: 'string' },
      city: { type: 'string' },
      country: { type: 'string' },
      logo: { type: 'string' },
    },
  });

  server.addSchema({
    $id: 'ProjectUpdateBody',
    type: 'object',
    required: ['name', 'paymentProvider', 'webhookUrl'],
    additionalProperties: false,
    properties: {
      name: { type: 'string' },
      mollieApiKey: { type: 'string' },
      paymentProvider: { type: 'string', enum: ['mocked', 'mollie'] },
      webhookUrl: { type: 'string' },
      invoiceData: { $ref: 'ProjectInvoiceDataUpdateBody' },
      apiToken: { type: 'string' },
      currency: { type: 'string' },
      vatRate: { type: 'number' },
    },
  });

  server.post('/project', {
    schema: {
      operationId: 'createProject',
      summary: 'Create a project',
      tags: ['project'],
      body: {
        $ref: 'ProjectUpdateBody',
      },
      response: {
        200: {
          $ref: 'Project',
        },
        400: {
          $ref: 'ErrorResponse',
        },
        500: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const body = request.body as ProjectUpdateBody;

      const projectInvoiceData = new ProjectInvoiceData({
        name: body.invoiceData?.name,
        email: body.invoiceData?.email,
        addressLine1: body.invoiceData?.addressLine1,
        addressLine2: body.invoiceData?.addressLine2,
        city: body.invoiceData?.city,
        country: body.invoiceData?.country,
        zipCode: body.invoiceData?.zipCode,
        logo: body.invoiceData?.logo,
      });

      const apiToken = body.apiToken || (await generateApiToken());
      if (apiToken.length < 32) {
        return reply.code(400).send({ error: 'Api token must be at least 32 characters long' });
      }

      const project = new Project({
        name: body.name,
        invoiceData: projectInvoiceData,
        mollieApiKey: body.mollieApiKey,
        paymentProvider: body.paymentProvider || 'mollie',
        webhookUrl: body.webhookUrl,
        apiToken,
        currency: body.currency,
        vatRate: body.vatRate,
      });

      await database.em.persistAndFlush(project);

      await reply.send(project);
    },
  });

  server.get('/project', {
    schema: {
      operationId: 'listProjects',
      summary: 'Get all projects',
      tags: ['project'],
      response: {
        200: {
          type: 'array',
          items: {
            $ref: 'Project',
          },
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const projects = await database.projects.find({});

      await reply.send(projects);
    },
  });

  server.get('/project/:projectId', {
    schema: {
      operationId: 'getProject',
      summary: 'Get a project',
      tags: ['project'],
      params: {
        type: 'object',
        required: ['projectId'],
        additionalProperties: false,
        properties: {
          projectId: { type: 'string' },
        },
      },
      response: {
        200: {
          $ref: 'Project',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const { projectId } = request.params as { projectId: string };

      if (projectId === 'token-project') {
        const project = await getProjectFromRequest(request);
        return reply.send(project);
      }

      const project = await database.projects.findOne({ _id: projectId });
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      await reply.send(project);
    },
  });

  server.patch('/project/:projectId', {
    schema: {
      operationId: 'patchProject',
      summary: 'Patch a project',
      tags: ['project'],
      params: {
        type: 'object',
        required: ['projectId'],
        additionalProperties: false,
        properties: {
          projectId: { type: 'string' },
        },
      },
      body: {
        $ref: 'ProjectUpdateBody',
      },
      response: {
        200: {
          $ref: 'Project',
        },
        404: {
          $ref: 'ErrorResponse',
        },
      },
    },
    handler: async (request, reply) => {
      const { projectId } = request.params as { projectId: string };

      const body = request.body as ProjectUpdateBody;

      const project = await database.projects.findOne({ _id: projectId }, { populate: ['invoiceData'] });
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      project.name = body.name;
      project.mollieApiKey = body.mollieApiKey || project.mollieApiKey;
      project.paymentProvider = body.paymentProvider || project.paymentProvider;
      project.webhookUrl = body.webhookUrl || project.webhookUrl;
      project.currency = body.currency || project.currency;
      project.vatRate = body.vatRate || project.vatRate;

      if (body.apiToken) {
        project.apiToken = await generateApiToken();
      }

      if (!project.invoiceData) {
        project.invoiceData = new ProjectInvoiceData();
      }

      project.invoiceData.name = body.invoiceData?.name || project.invoiceData.name;
      project.invoiceData.email = body.invoiceData?.email || project.invoiceData.email;
      project.invoiceData.addressLine1 = body.invoiceData?.addressLine1 || project.invoiceData.addressLine1;
      project.invoiceData.addressLine2 = body.invoiceData?.addressLine2 || project.invoiceData.addressLine2;
      project.invoiceData.city = body.invoiceData?.city || project.invoiceData.city;
      project.invoiceData.country = body.invoiceData?.country || project.invoiceData.country;
      project.invoiceData.zipCode = body.invoiceData?.zipCode || project.invoiceData.zipCode;
      project.invoiceData.logo = body.invoiceData?.logo || project.invoiceData.logo;

      await database.em.persistAndFlush(project);

      await reply.send(project);
    },
  });

  server.delete('/project/:projectId', {
    schema: {
      operationId: 'deleteProject',
      summary: 'Delete a project',
      tags: ['project'],
      params: {
        type: 'object',
        required: ['projectId'],
        additionalProperties: false,
        properties: {
          projectId: { type: 'string' },
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
      const { projectId } = request.params as { projectId: string };

      const project = await database.projects.findOne({ _id: projectId }, { populate: ['invoiceData'] });
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      // TODO: remove all nested entities as well (customers, subscriptions, invoices, ...)
      await database.em.removeAndFlush(project);

      await reply.send({ ok: true });
    },
  });
}
