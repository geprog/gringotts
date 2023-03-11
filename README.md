# Gringotts (:warning: ALPHA STATE :warning:)

[![npm version](https://img.shields.io/npm/v/@geprog/gringotts-client)](https://www.npmjs.com/package/@geprog/gringotts-client)
[![docker image Version (latest by date)](https://img.shields.io/docker/v/geprog/gringotts?label=docker)](https://github.com/geprog/gringotts-payments/pkgs/container/gringotts)

Gringotts is an api service (maybe a frontend will follow at some point) which can be used as gateway between your payment provider and for example your SAAS application. It allows you to easily handle subscriptions for your users.

## Features & TODO

- [x] start subscription
- [x] change subscription in middle of period (prorations)
- [ ] end / pause subscription
- [x] charge customer at end of subscription period
- [ ] charge customer at start of subscription period
- [ ] charge customer one-time fee
- [ ] allow customers to charge other customers
- [x] manage customers
- [x] notify SAAS backend about subscription updates
- [ ] payment providers
  - [x] mollie
  - [ ] stripe
- [x] authentication for SAAS backends
- [ ] invoices
  - [x] for subscriptions
  - [ ] themes for invoices
- [ ] notify customer about
  - [ ] new invoices
  - [ ] upcoming payment
- [ ] get subscription costs forecast
- [x] typescript api client => `@geprog/gringotts-client`
- [ ] support name for subscription changes & invoice positions
- [ ] configurable payment interval (currently 1 month)
- [ ] add logic to definitely prevent duplicate payments
- [x] save payments and their status to the database
- [ ] skip subscription change if equal to currently active
- [ ] customer payment methods
  - [ ] add payment method
  - [ ] verify payment method

## Usage

### Container image

The container image can be found at `ghcr.io/geprog/gringotts`.

### Environment Variables

| Name                | Description                                                      | Default                                               |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| PORT                | Port on which the server should listen                           | 3000                                                  |
| PUBLIC_URL          | Url on which the server is reachable                             | http://localhost:3000                                 |
| POSTGRES_URL        | Url to the postgres database                                     | postgres://postgres:postgres@localhost:5432/gringotts |
| ADMIN_TOKEN         | Token which is used to authenticate admin endpoints like project |                                                       |
| CREATE_PROJECT_DATA | Json string which is used to create the first project            |                                                       |
| DATA_PATH           | Path to the data directory                                       | Local: ./data Container: /app/data                    |
| GOTENBERG_URL       | Url to the gotenberg server                                      | http://localhost:3000                                 |
| JWT_SECRET          | Secret used to sign jwt tokens                                   | supersecret                                           |

To create a project on start you can set the `CREATE_PROJECT_DATA` environment variable to a json string like this:

`CREATE_PROJECT_DATA='{ "name": "TestProject", "mollieApiKey": "123", "paymentProvider": "mollie", "webhookUrl": "http://localhost:4000/payments/webhook", "invoiceData": { "email": "test@example.com", "name": "Company ABC", "addressLine1": "Diagon Alley 1337", "addressLine2": "string", "zipCode": "12345", "city": "London", "country": "Germany", "logo": "https://geprog.com/logo.svg" } }'`

> Keep in mind that this wont be updated later if you change the environment variables after the first start.

### OpenApi Documention

The OpenApi documentation can be found at `https://<PUBLIC_URL>/docs` like <http://localhost:3000/docs>

## Development

### Setup

```bash
docker-compose up -d

# install dependencies
pnpm i

# copy .env.example to .env and adjust the values
cp .env.example .env

# start the server
pnpm start
```
