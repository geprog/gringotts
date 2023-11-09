import handlebars from 'handlebars';

import { Currency, Customer, Invoice, Project } from '~/entities';
import { formatDate } from '~/lib/dayjs';

type TemplateContext = Record<string, any>;

type Template<SubjectData extends TemplateContext, TextData extends TemplateContext> = {
  subject: ReturnType<typeof handlebars.compile<SubjectData>>;
  text: ReturnType<typeof handlebars.compile<TextData>>;
};

type Languages = 'en' | 'de';

type MultiLanguageTemplate<SubjectData extends TemplateContext, TextData extends TemplateContext> = {
  subject: Record<Languages, Template<SubjectData, TextData>['subject']>;
  text: Record<Languages, Template<SubjectData, TextData>['text']>;
};

/** 
 * The template contexts must match the following type Record<string, { subject: TemplateContext; text: TemplateContext }>.
 * If this does not match the type Templates below will throw a typescript error.
 */
type TemplateContexts = {
  newInvoice: {
    subject: { project: Project; invoice: Invoice },
    text: { customer: Customer; invoice: Invoice },
  },
};

type Templates = {
  [K in keyof TemplateContexts]: MultiLanguageTemplate<TemplateContexts[K]['subject'], TemplateContexts[K]['text']>;
};

handlebars.registerHelper('formatDate', (date: Date, format: string) => formatDate(date, format));
handlebars.registerHelper('amountToPrice', (amount: number, currency: Currency) =>
  Invoice.amountToPrice(amount, currency),
);

// When adding a new template, you must specify the context first in the type "TemplateContexts" above.
// Only the variables specified in the contexts should be used in the actual mail template, because everything else would not be typechecked.
const templates: Templates = {
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

export function getTemplate<K extends keyof Templates>(
  customer: Customer,
  template: K,
): Template<TemplateContexts[K]['subject'], TemplateContexts[K]['text']> {
  const language = (customer.language || 'en') as Languages;
  return {
    subject: templates[template].subject[language],
    text: templates[template].text[language],
  };
}