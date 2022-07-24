# Gringotts payments

Gringotts payments is a REST service which can be used as gateway between your payment provider and your SAAS application. It allows you to easily handle your users subscriptions.

## Features

- [x] start subscription
- [x] change subscription in middle of period
- [ ] end / pause subscription
- [ ] auto charge at end of subscription period
- [x] manage customers
- [ ] notify SAAS backend about subscription updates
- [x] payment providers
  - [x] mollie
- [ ] authentication for SAAS backends
- [ ] authentication for payment provider webhook calls
- [ ] invoices per email
- [ ] notify customer about upcoming payment
- [ ] get costs forecast
- [x] typescript api client => `@geprog/payment-gateway-client`
- [ ] support name for subscription changes & invoice positions
