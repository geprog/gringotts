import { gringottsClient } from '@geprog/gringotts-client';
import fetch from 'cross-fetch';

export function useGringottsClient(token: string) {
  const config = useRuntimeConfig();
  return gringottsClient(config.public.api.baseUrl, {
    customFetch: fetch,
    token,
  });
}
