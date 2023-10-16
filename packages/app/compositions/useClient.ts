import { gringottsClient } from '@geprog/gringotts-client';

export async function useGringottsClient() {
  const auth = await useAuth();
  const user = auth.user.value;

  if (!user) {
    throw new Error('user is required');
  }

  return gringottsClient(user.backendUrl, {
    token: user.token,
  });
}
