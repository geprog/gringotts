import got from 'got';

export async function triggerWebhook({
  url,
  body,
  token,
}: {
  url: string;
  body: unknown;
  token: string;
}): Promise<boolean> {
  const headers = {
    authorization: 'Bearer ' + token,
  };

  try {
    await got.post(url, {
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
