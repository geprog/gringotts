import { gringottsClient } from '@geprog/gringotts-client';
import fetch from 'cross-fetch';
import type { H3Event } from 'h3';

export function useGringottsClient(event: H3Event, token: string) {
  const config = useRuntimeConfig(event);
  return gringottsClient(config.public.api.baseUrl, {
    customFetch: fetch,
    token,
  });
}
