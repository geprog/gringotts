import jwt from 'jsonwebtoken';

import { Api, ApiConfig } from './api';

export function gringottsClient<SecurityDataType = unknown>(
  baseUrl: string,
  options?: ApiConfig<SecurityDataType> & { token?: string; jwtPayload?: Record<string, unknown> },
): Api<SecurityDataType> {
  return new Api({
    ...options,
    baseUrl,
    baseApiParams: {
      format: 'json',
    },
    securityWorker: () => {
      if (!options?.token) {
        return;
      }

      const token = jwt.sign(options.jwtPayload || {}, options.token);

      return {
        secure: true,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    },
  });
}

export * from './api';
