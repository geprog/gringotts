import got from 'got';

import { config } from '~/config';

export async function triggerWebhook({ body, token }: { body: unknown; token: string }): Promise<boolean> {
  const webhookUrl = config.webhookUrl;

  const headers = {
    authorization: 'Bearer ' + token,
  };

  try {
    await got.post(webhookUrl, {
      json: body as string,
      headers,
      retry: { limit: 10, methods: ['POST'] },
    });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }

  return false;
}
