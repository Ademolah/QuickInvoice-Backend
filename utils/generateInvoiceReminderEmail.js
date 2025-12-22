

function generateInvoiceReminderEmail({
  businessName,
  clientName,
  clientEmail,
  clientPhone,
  total,
  outstandingBalance,
}) {
  return `
  <div style="font-family: Inter, Arial, sans-serif; background:#F9FAFB; padding:30px;">
    <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <!-- Header -->
      <div style="background:linear-gradient(90deg,#0046A5,#00B86B);color:white;padding:20px;text-align:center;">
        <h1 style="margin:0; font-family:Poppins, Arial, sans-serif; font-size:24px; color:#FFFFFF;">QuickInvoice</h1>
      </div>
      <!-- Body -->
      <div style="padding:24px;color:#111827;">
        <p style="font-size:16px;">Hello <strong>${businessName}</strong>,</p>
        <p>
          This is a reminder that you have an <strong>unpaid invoice</strong> that has been sent
          but not yet marked as paid.
        </p>
        <div style="background:#F3F4F6;border-radius:10px;padding:16px;margin:20px 0;">
          <p><strong>Client Name:</strong> ${clientName}</p>
          <p><strong>Client Email:</strong> ${clientEmail}</p>
          <p><strong>Client Phone:</strong> ${clientPhone || "—"}</p>
          <p><strong>Total:</strong> ₦${Number(total).toLocaleString()}</p>
          <p><strong>Outstanding Balance:</strong> ₦${Number(outstandingBalance).toLocaleString()}</p>
        </div>
        <p style="font-size:14px;color:#374151;">
          If this invoice has already been paid, please ensure it is
          <strong>marked as paid</strong> in your QuickInvoice dashboard, inside the "Invoice" Page
          to avoid further reminders.
        </p>
        <p style="margin-top:24px;">
          Regards,<br />
          <strong>QuickInvoice Team</strong>
        </p>
      </div>
      <!-- Footer -->
      <div style="background:#F9FAFB;text-align:center;padding:14px;font-size:12px;color:#6B7280;">
        © ${new Date().getFullYear()} QuickInvoice. All rights reserved.
      </div>
    </div>
  </div>
  `;
}


module.exports = generateInvoiceReminderEmail;