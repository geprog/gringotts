# Gringotts payments

[![npm version](https://img.shields.io/npm/v/@geprog/gringotts-payments-client)](https://www.npmjs.com/package/@geprog/gringotts-payments-client)
[![docker image Version (latest by date)](https://img.shields.io/docker/v/geprog/gringotts-payments?label=docker)](https://github.com/geprog/gringotts-payments/pkgs/container/gringotts-payments)

Gringotts payments is a REST service which can be used as gateway between your payment provider and your SAAS application. It allows you to easily handle your users subscriptions.

## Features

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
- [x] typescript api client => `@geprog/payment-gateway-client`
- [ ] support name for subscription changes & invoice positions
- [ ] configurable payment interval (currently 1 month)
- [ ] add logic to definitely prevent duplicate payments
- [ ] save payments and their status to the database
