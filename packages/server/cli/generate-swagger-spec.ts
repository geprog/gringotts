import fs from 'fs';
import path from 'path';

import { config } from '~/config';
import { init } from '~/server';

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
