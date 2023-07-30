import { gringottsClient } from '@geprog/gringotts-client';

export function useGringottsClient() {
  const baseURL = 'http://localhost:7171';
  const token = useCookie('project-token').value;

  if (!token) {
    throw new Error('project-token is required');
  }

  return gringottsClient(baseURL, {
    token: token,
  });
}
