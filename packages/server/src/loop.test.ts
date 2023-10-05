import { beforeAll, describe, it, vi } from 'vitest';

import * as config from '~/config';
import * as databaseExports from '~/database';

describe('Loop', () => {
  beforeAll(async () => {
    vi.spyOn(config, 'config', 'get').mockReturnValue({
      port: 1234,
      adminToken: '',
      postgresUrl: 'postgres://postgres:postgres@localhost:5432/postgres',
      publicUrl: '',
      dataPath: '',
      gotenbergUrl: '',
      jwtSecret: '',
    });

    await databaseExports.database.init();
  });

  it.todo('should loop due tasks');
  it.todo('should should set task endedAt if done');
  it.todo('should should set task error if failed');
});
