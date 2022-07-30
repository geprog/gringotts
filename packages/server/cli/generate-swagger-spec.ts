import fs from 'fs';
import path from 'path';

import { init } from '~/api';
import { config } from '~/config';

async function generateSwaggerSpec() {
  config.jwtSecret = '123'; // TODO: find proper solution

  const server = await init();
  await server.ready();
  const spec = server.swagger();
  const jsonSpec = JSON.stringify(spec, null, 2);
  const filePath = path.join(__dirname, '..', '/swagger.json');
  fs.writeFileSync(filePath, jsonSpec);
}

void generateSwaggerSpec();
