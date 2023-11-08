import fs from 'fs';
import handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import path from 'path';

import { config } from '~/config';
import { Currency, Customer, Invoice } from '~/entities';
import { formatDate } from '~/lib/dayjs';
import { log } from '~/log';

let transporter: nodemailer.Transporter;

export function init(): void {
  const mailConfig = config.mail;

  if (!mailConfig.host || !mailConfig.port || !mailConfig.username || !mailConfig.password) {
    log.info('No mail config found, skipping mail initialization');
    return;
  }

  handlebars.registerHelper('formatDate', (date: Date, format: string) => formatDate(date, format));
  handlebars.registerHelper('amountToPrice', (amount: number, currency: Currency) =>
    Invoice.amountToPrice(amount, currency),
  );

  transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure,
    requireTLS: mailConfig.requireTLS,
    auth: {
      user: mailConfig.username,
      pass: mailConfig.password,
    },
  });
}

type Languages = 'en' | 'de';
type Template = {
  subject: Record<Languages, ReturnType<typeof handlebars.compile>>;
  text: Record<Languages, ReturnType<typeof handlebars.compile>>;
};

const templates: Record<string, Template> = {
  newInvoice: {
    subject: {
      en: handlebars.compile(`{{ project.name }} - New invoice {{ invoice.number }}`),
      de: handlebars.compile(`{{ project.name }} - Neue Rechnung {{ invoice.number }}`),
    },
    text: {
      en: handlebars.compile(`
Hello {{ customer.name }},

we have created a new invoice for you.

Please find the invoice {{ invoice.number }} attached as PDF.

The invoice amount of {{{amountToPrice invoice.totalAmount invoice.currency}}} will be charged to your account soon.

To view and print the invoice you need a PDF reader.

Please do not reply to this email.

Best regards
`),
      de: handlebars.compile(`
Hallo {{ customer.name }},

anbei erhalten Sie Ihre aktuelle Rechnung {{ invoice.number }} als PDF-Dokument.

Der Rechnungsbetrag von {{{amountToPrice invoice.totalAmount invoice.currency}}} wird demnächst von Ihrem Konto abgebucht.

Zum Ansehen und Ausdrucken der Rechnung wird ein PDF-Reader benötigt.

Antworten Sie bitte nicht auf diese E-Mail.

Viele Grüße
`),
    },
  },
};

function getTemplate(
  customer: Customer,
  template: keyof typeof templates,
): { subject: HandlebarsTemplateDelegate; text: HandlebarsTemplateDelegate } {
  const language = (customer.language || 'en') as Languages;
  return {
    subject: templates[template].subject[language],
    text: templates[template].text[language],
  };
}

export async function sendInvoiceMail(invoice: Invoice, customer: Customer): Promise<void> {
  if (!transporter) {
    return;
  }

  const template = getTemplate(customer, 'newInvoice');

  const subject = template.subject({
    invoice: invoice.toJSON(),
    project: invoice.project,
  });

  const text = template.text({
    invoice: invoice.toJSON(),
    customer: invoice.customer,
  });

  try {
    const invoicePath = path.join(config.dataPath, 'invoices', invoice.getInvoicePath());
    if (!fs.existsSync(invoicePath)) {
      await invoice.generateInvoicePdf();
    }

    await transporter.sendMail({
      from: config.mail.from,
      to: customer.email,
      subject,
      text,
      attachments: [
        {
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
          path: invoicePath,
        },
      ],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Problem sending invoice mail', error);
  }
}
