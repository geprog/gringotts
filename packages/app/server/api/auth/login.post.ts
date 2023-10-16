import { gringottsClient } from '@geprog/gringotts-client';
import fetch from 'cross-fetch';

function useGringottsClient(token: string) {
  const { baseUrl } = useRuntimeConfig().api;
  return gringottsClient(baseUrl, {
    customFetch: fetch,
    token,
  });
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const projectToken = body?.projectToken;
  if (!projectToken) {
    return createError({
      statusCode: 400,
      message: 'project-token is required',
    });
  }

  const client = useGringottsClient(projectToken);

  try {
    await client.customer.customerList();
  } catch (error) {
    return createError({
      statusCode: 401,
      message: 'project-token is invalid',
    });
  }

  const session = await useAuthSession(event);
  await session.update({
    token: projectToken,
  });

  return {
    ok: true,
  };
});
