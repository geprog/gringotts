import { gringottsClient } from '@geprog/gringotts-client';

export async function useGringottsClient() {
  const auth = useAuth();
  await auth.load();
  const user = auth.user;

  if (!user) {
    throw new Error('user is required');
  }

  const config = useRuntimeConfig();
  return gringottsClient(config.public.api.baseUrl, {
    token: user.token,
  });
}
