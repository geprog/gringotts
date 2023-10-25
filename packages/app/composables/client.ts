import { gringottsClient } from '@geprog/gringotts-client';

export async function useGringottsClient() {
  const auth = useAuth();
  await auth.load();
  const user = auth.user;

  if (!user) {
    throw new Error('user is required');
  }

  const config = useRuntimeConfig();
  const url = process.client ? config.public.api.clientBaseUrl : config.public.api.baseUrl;
  return gringottsClient(url, {
    token: user.token,
  });
}
