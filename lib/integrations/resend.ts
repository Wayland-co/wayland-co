import "server-only";
import { Resend } from "resend";
import { content } from "@/lib/content";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM;
const resend = apiKey ? new Resend(apiKey) : null;

export type LeadNotificationInput = {
  firstname: string;
  lastname?: string;
  email: string;
  phone?: string;
  message: string;
};

export type LeadNotificationResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "send-failed" };

export function isResendConfigured(): boolean {
  return Boolean(resend && fromAddress);
}

export async function sendLeadNotification(
  lead: LeadNotificationInput,
): Promise<LeadNotificationResult> {
  if (!resend || !fromAddress) {
    return { sent: false, reason: "not-configured" };
  }

  const businessName = content.business.name;
  const ownerEmail = content.business.email;
  // Route lead notifications to an explicit inbox (e.g. a personal address)
  // when set — lets leads land somewhere real before a domain-email address
  // exists. Falls back to the public business email from the brief.
  const notifyTo = process.env.CONTACT_NOTIFY_TO || ownerEmail;
  const from = `${businessName} <${fromAddress}>`;
  const fullName = [lead.firstname, lead.lastname]
    .filter((s): s is string => Boolean(s && s.length))
    .join(" ");

  // Owner notification is the critical send — if it fails, report failure.
  try {
    await resend.emails.send({
      from,
      to: notifyTo,
      subject: `New lead: ${fullName || lead.firstname}`,
      text: `New lead from the website:

Name: ${fullName || lead.firstname}
Email: ${lead.email}
Phone: ${lead.phone ?? "—"}

Message:
${lead.message}
`,
    });
  } catch {
    return { sent: false, reason: "send-failed" };
  }

  // Auto-reply to the visitor is best-effort: a sandbox sender (or any sender
  // restricted to the account owner) will reject arbitrary recipients, and
  // that must NOT fail the submission — the lead already reached the owner.
  try {
    await resend.emails.send({
      from,
      to: lead.email,
      subject: `Thanks for reaching out — ${businessName}`,
      text: `Hi ${lead.firstname},

Thanks for reaching out. We received your message and will respond within 1 business day.

— ${businessName}
`,
    });
  } catch {
    // best-effort; ignore
  }

  return { sent: true };
}
