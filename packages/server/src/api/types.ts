import { Project } from '~/entities';

declare module 'fastify' {
  export interface FastifyRequest {
    project?: Project;
    admin?: boolean;
  }
}
