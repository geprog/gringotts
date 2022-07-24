import { Api, ApiConfig } from './api';

export function paymentGatewayClient<SecurityDataType = unknown>(
  baseUrl: string,
  options?: ApiConfig<SecurityDataType> & { token?: string },
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

      return {
        secure: true,
        headers: {
          Authorization: `token ${options.token}`,
        },
      };
    },
  });
}

export * from './api';
