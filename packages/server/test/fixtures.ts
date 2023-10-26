import { Customer, Invoice, InvoiceItem, PaymentMethod, Project, ProjectInvoiceData, Subscription } from '~/entities';
import dayjs from '~/lib/dayjs';
import { getPeriodFromAnchorDate } from '~/utils';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getFixtures() {
  const projectInvoiceData = new ProjectInvoiceData({
    name: 'Test company',
    addressLine1: 'My Street 123',
    addressLine2: 'Postbox 321',
    email: 'test@example.tld',
    logo: 'http://localhost/my-logo.png',
    zipCode: 'GB-12345',
    city: 'London',
    country: 'GB',
  });

  const project = new Project({
    _id: '123',
    apiToken: 'abc-123',
    invoiceData: projectInvoiceData,
    paymentProvider: 'mocked',
    webhookUrl: 'http://localhost',
    name: 'Test Project',
    mollieApiKey: 'not-used',
    currency: 'EUR',
    vatRate: 19.0,
  });

  const customer = new Customer({
    addressLine1: 'BigBen Street 954',
    addressLine2: '123',
    city: 'London',
    country: 'GB',
    email: 'john@doe.co.uk',
    name: 'John Doe',
    zipCode: 'ENG-1234',
    paymentProviderId: '123',
    invoicePrefix: 'INV-F1B-0B6H',
    project,
  });

  const anchorDate = dayjs('2020-01-01 07:23').toDate();

  const currentPeriod = getPeriodFromAnchorDate(anchorDate, anchorDate);
  const subscription = new Subscription({
    anchorDate,
    customer,
    project,
    currentPeriodStart: currentPeriod.start,
    currentPeriodEnd: currentPeriod.end,
  });
  subscription.changePlan({ pricePerUnit: 12.34, units: 12 });
  subscription.changePlan({ pricePerUnit: 12.34, units: 15, changeDate: dayjs('2020-01-15').toDate() });
  subscription.changePlan({ pricePerUnit: 5.43, units: 15, changeDate: dayjs('2020-01-20').toDate() });

  const { end } = getPeriodFromAnchorDate(dayjs('2020-01-15').toDate(), subscription.anchorDate);

  const invoice = new Invoice({
    _id: '123',
    vatRate: 19.0,
    currency: 'EUR',
    date: end,
    sequentialId: 2,
    status: 'draft',
    customer,
    subscription,
    project,
  });

  invoice.items.add(
    new InvoiceItem({
      description: 'Test item',
      pricePerUnit: 12.34,
      units: 13,
    }),
  );

  invoice.items.add(
    new InvoiceItem({
      description: 'Second test item',
      pricePerUnit: 54.32,
      units: 1,
    }),
  );

  const paymentMethod = new PaymentMethod({
    _id: '123',
    customer,
    paymentProviderId: 'mock-123',
    name: 'Visa',
    type: 'credit-card',
    project,
  });
  customer.paymentMethods.add(paymentMethod);
  customer.activePaymentMethod = paymentMethod;

  return { customer, subscription, invoice, project, paymentMethod };
}
