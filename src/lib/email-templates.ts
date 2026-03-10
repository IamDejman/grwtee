/**
 * Branded HTML email templates for GRWTEE. Inline styles only (email client compatibility).
 * Colors: purple #422D64, green #0D674E, cream #F5F3E7, gray #2C3E50
 */

const BRAND = {
  purple: "#422D64",
  purpleMedium: "#5B3D8A",
  green: "#0D674E",
  cream: "#F5F3E7",
  creamLight: "#FAF8F3",
  white: "#FFFFFF",
  gray: "#2C3E50",
  grayMuted: "#5a6c7d",
};

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrapper: max-width 600px, cream background, padding. */
function wrapBody(inner: string): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BRAND.cream};font-family:Georgia,'Times New Roman',serif;">
  <tr><td style="padding:32px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin:0 auto;background-color:${BRAND.white};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(66,45,100,0.08);">
      ${inner}
    </table>
  </td></tr>
</table>`;
}

/** Header block with GRWTEE logo text. */
function header(): string {
  return `
  <tr><td style="background:linear-gradient(135deg,${BRAND.purple} 0%,${BRAND.purpleMedium} 100%);padding:28px 32px;text-align:center;">
    <span style="font-size:26px;font-weight:700;letter-spacing:0.12em;color:${BRAND.white};font-family:Georgia,serif;">GRWTEE</span>
  </td></tr>`;
}

/** Admin notification: new booking request details. */
export function bookingNotificationHtml(params: {
  name: string;
  email: string;
  phone: string;
  serviceLabel: string;
  messageHtml: string;
  siteUrl: string;
}): string {
  const { name, email, phone, serviceLabel, messageHtml, siteUrl } = params;
  const adminUrl = `${siteUrl}/admin/bookings`;
  return wrapBody(`
  ${header()}
  <tr><td style="padding:32px;">
    <p style="margin:0 0 20px 0;font-size:15px;color:${BRAND.gray};line-height:1.6;">A new booking request has been received.</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BRAND.creamLight};border-radius:8px;border:1px solid #e8e6df;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          <tr><td style="padding:6px 0;"><span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.grayMuted};font-weight:600;">Name</span></td></tr>
          <tr><td style="padding:2px 0 14px 0;font-size:16px;color:${BRAND.gray};font-weight:500;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 0;"><span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.grayMuted};font-weight:600;">Email</span></td></tr>
          <tr><td style="padding:2px 0 14px 0;"><a href="mailto:${escapeHtml(email)}" style="font-size:16px;color:${BRAND.green};text-decoration:none;font-weight:500;">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:6px 0;"><span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.grayMuted};font-weight:600;">Phone</span></td></tr>
          <tr><td style="padding:2px 0 14px 0;font-size:16px;color:${BRAND.gray};font-weight:500;">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:6px 0;"><span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.grayMuted};font-weight:600;">Service</span></td></tr>
          <tr><td style="padding:2px 0 14px 0;font-size:16px;color:${BRAND.purple};font-weight:600;">${escapeHtml(serviceLabel)}</td></tr>
          <tr><td style="padding:6px 0;"><span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.grayMuted};font-weight:600;">Message</span></td></tr>
          <tr><td style="padding:2px 0 0 0;font-size:15px;color:${BRAND.gray};line-height:1.6;">${messageHtml}</td></tr>
        </table>
      </td></tr>
    </table>
    <p style="margin:24px 0 0 0;text-align:center;">
      <a href="${escapeHtml(adminUrl)}" style="display:inline-block;padding:14px 28px;background-color:${BRAND.green};color:${BRAND.white};text-decoration:none;font-size:14px;font-weight:600;border-radius:999px;letter-spacing:0.02em;">View in admin</a>
    </p>
  </td></tr>
  <tr><td style="padding:16px 32px 24px;text-align:center;">
    <p style="margin:0;font-size:12px;color:${BRAND.grayMuted};">
      <a href="${escapeHtml(adminUrl)}" style="color:${BRAND.grayMuted};text-decoration:underline;">${escapeHtml(adminUrl)}</a>
    </p>
  </td></tr>
  `);
}

/** Customer confirmation: we received your request. */
export function bookingConfirmationHtml(params: {
  name: string;
  serviceLabel: string;
}): string {
  const { name, serviceLabel } = params;
  return wrapBody(`
  ${header()}
  <tr><td style="padding:36px 32px;">
    <p style="margin:0 0 16px 0;font-size:18px;color:${BRAND.gray};line-height:1.5;">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 20px 0;font-size:15px;color:${BRAND.gray};line-height:1.65;">Thank you for reaching out to <strong style="color:${BRAND.purple};">GRWTEE</strong>. We've received your booking request and will get back to you within <strong>24–48 hours</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${BRAND.creamLight};border-radius:8px;border:1px solid #e8e6df;">
      <tr><td style="padding:16px 20px;">
        <span style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:${BRAND.grayMuted};font-weight:600;">Service interest</span>
        <p style="margin:6px 0 0 0;font-size:16px;color:${BRAND.purple};font-weight:600;">${escapeHtml(serviceLabel)}</p>
      </td></tr>
    </table>
    <p style="margin:28px 0 0 0;font-size:15px;color:${BRAND.gray};line-height:1.6;">Warm regards,<br/><strong style="color:${BRAND.purple};">GRWTEE</strong></p>
  </td></tr>
  `);
}
