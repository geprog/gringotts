# Gringotts (:warning: ALPHA STATE :warning:)

[![npm version](https://img.shields.io/npm/v/@geprog/gringotts-client)](https://www.npmjs.com/package/@geprog/gringotts-client)
[![docker image Version (latest by date)](https://img.shields.io/docker/v/geprog/gringotts?label=docker)](https://github.com/geprog/gringotts-payments/pkgs/container/gringotts)

Gringotts is an api service (maybe a frontend will follow at some point) which can be used as gateway between your payment provider and for example your SAAS application. It allows you to easily handle subscriptions for your users.

## Features & TODO

- [x] start subscription
- [x] change subscription in middle of period (prorations)
- [ ] end / pause subscription
- [x] charge customers at end of subscription period
- [x] manage customers
- [x] notify SAAS backend about subscription updates
- [x] payment providers
  - [x] mollie
  - [ ] stripe
- [x] authentication for SAAS backends
- [ ] authentication for payment provider webhook calls
- [ ] invoices for customers per email
  - [ ] themes for invoices
- [ ] notify customer about upcoming payment
- [ ] get subscription costs forecast
- [x] typescript api client => `@geprog/gringotts-client`
- [ ] support name for subscription changes & invoice positions
- [ ] configurable payment interval (currently 1 month)
- [ ] add logic to definitely prevent duplicate payments
- [ ] save payments and their status to the database
- [ ] skip subscription change if equal to currently active

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

### OpenApi Documention

The OpenApi documentation can be found at `https://<PUBLIC_URL>/docs` like <http://localhost:3000/docs>
