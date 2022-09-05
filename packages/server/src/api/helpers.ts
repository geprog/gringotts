import { FastifyRequest } from 'fastify';

import { Project } from '~/entities';

// eslint-disable-next-line @typescript-eslint/require-await
export async function getProjectFromRequest(request: FastifyRequest): Promise<Project> {
  if (!request.project) {
    throw new Error('request.project should be defined');
  }

  return request.project;
}
