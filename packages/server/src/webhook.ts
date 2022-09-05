import got from 'got';

export async function triggerWebhook({ url, body }: { url: string; body: unknown }): Promise<boolean> {
  try {
    await got.post(url, {
      json: body as string,
      retry: { limit: 10, methods: ['POST'] },
    });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }

  return false;
}
