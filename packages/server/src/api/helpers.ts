import { FastifyRequest } from 'fastify';

import { database } from '~/database';
import { Project } from '~/entities';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: number;
      project: string;
    };
  }
}

export async function getProjectFromRequest(request: FastifyRequest): Promise<Project> {
  const user = request.user;

  return database.projects.findOneOrFail(user.project);
}
