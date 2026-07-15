import type { BookingRequest, Invoice } from "@prisma/client";

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "****";
  return `${local.slice(0, 1)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `***${digits.slice(-4)}`;
}

export function maskBookingListItem(booking: BookingRequest) {
  return {
    id: booking.id,
    name: booking.name,
    email: maskEmail(booking.email),
    phone: maskPhone(booking.phone),
    service: booking.service,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

export function maskInvoiceListItem(invoice: Invoice) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    clientName: invoice.clientName,
    clientAddress: invoice.clientAddress ? "[redacted]" : null,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    status: invoice.status,
    reference: invoice.reference,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt
  };
}
