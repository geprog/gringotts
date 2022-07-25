import got from 'got';

import { config } from '~/config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryTimeouts = [1000, 1000 * 10, 1000 * 60, 1000 * 60 * 5];

export async function triggerWebhook({ body, token }: { body: unknown; token: string }): Promise<boolean> {
  const webhookUrl = config.webhookUrl;

  const headers = {
    'Content-Type': 'application/json',
    authorization: 'Bearer ' + token,
  };

  for await (const timeout of retryTimeouts) {
    try {
      await got.post(webhookUrl, {
        body: body as string,
        headers,
      });
      return true;
    } catch (e) {
      await sleep(timeout);
    }
  }

  return false;
}
