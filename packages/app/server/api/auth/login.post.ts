import { gringottsClient } from '@geprog/gringotts-client';
import fetch from 'cross-fetch';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { token } = body;

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'token is required',
    });
  }

  const config = useRuntimeConfig();
  const client = gringottsClient(config.public.api.baseUrl, {
    customFetch: fetch,
    token,
  });

  try {
    await client.customer.listCustomers();
  } catch (error) {
    console.log(error);
    throw createError({
      statusCode: 401,
      message: 'project-token is invalid',
    });
  }

  const session = await useAuthSession(event);
  await session.update({
    token,
  });

  return {
    ok: true,
  };
});
