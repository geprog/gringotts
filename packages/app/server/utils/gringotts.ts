import { gringottsClient } from '@geprog/gringotts-client';
import fetch from 'cross-fetch';

export function useGringottsClient(token: string) {
  const baseUrl = 'http://localhost:7171';
  return gringottsClient(baseUrl, {
    customFetch: fetch,
    token,
  });
}
