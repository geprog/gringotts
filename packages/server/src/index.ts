import { init as serverInit } from '~/api';
import { checkConfig, config } from '~/config';
import { database } from '~/database';
import { loadNgrok } from '~/lib/development_proxy';
import { log } from '~/log';
import { startLoops } from '~/loop';
import { init as mailInit } from '~/mail';

async function start() {
  checkConfig();

  await loadNgrok();

  await database.init();
  await database.connect();

  mailInit();

  startLoops();

  const server = await serverInit();

  if (process.env.CREATE_PROJECT_DATA) {
    // check if there is already a project
    const projectsAmount = await database.projects.count({});
    if (projectsAmount === 0) {
      log.info('Creating project ...', JSON.parse(process.env.CREATE_PROJECT_DATA));
      const response = await server.inject({
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.adminToken}`,
        },
        url: '/api/project',
        payload: JSON.parse(process.env.CREATE_PROJECT_DATA) as Record<string, unknown>,
      });

      if (response.statusCode !== 200) {
        // eslint-disable-next-line no-console
        console.error(response.body);
        process.exit(1);
      }
    }
  }

  try {
    log.info(`Starting server ${config.publicUrl} ...`);
    await server.listen({ port: config.port, host: '::' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  }
}

void start();
