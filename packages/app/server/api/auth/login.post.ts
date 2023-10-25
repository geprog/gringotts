export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const projectToken = body?.token;

  if (!projectToken) {
    throw createError({
      statusCode: 400,
      message: 'project-token is required',
    });
  }

  const client = useGringottsClient(projectToken);
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
    token: projectToken,
  });

  return {
    ok: true,
  };
});
