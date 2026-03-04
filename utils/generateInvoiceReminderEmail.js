

function generateInvoiceReminderEmail({
  businessName,
  clientName,
  clientEmail,
  clientPhone,
  total,
  outstandingBalance,
}) {
  return `
  <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pending Payment Alert</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; color:#1E293B;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin: 40px auto; background:#FFFFFF; border-radius:24px; overflow:hidden; border: 1px solid #E2E8F0;">
    
    <tr>
      <td style="background:#FFFBEB; padding:16px 40px; border-bottom: 1px solid #FEF3C7;">
        <table width="100%">
          <tr>
            <td>
               <span style="color:#B45309; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px;">Payment Tracking Alert</span>
            </td>
            <td align="right">
              <div style="height:8px; width:8px; background:#F59E0B; border-radius:50%; display:inline-block;"></div>
              <span style="color:#F59E0B; font-size:11px; font-weight:800; margin-left:4px;">PENDING</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:40px;">
        <h2 style="font-size:24px; font-weight:800; letter-spacing:-1px; margin:0; color:#0F172A; line-height:1.2;">
          Hello ${businessName},
        </h2>
        <p style="margin:16px 0; font-size:15px; line-height:1.6; color:#475569;">
          Your automated ledger has identified an <strong>unpaid invoice</strong> that is currently impacting your projected cash flow.
        </p>

        <div style="background:#F8FAFC; border: 1px solid #E2E8F0; border-radius:20px; padding:24px; margin:30px 0;">
          <table width="100%">
            <tr>
              <td style="padding-bottom:15px;">
                <p style="margin:0; font-size:11px; font-weight:800; color:#94A3B8; text-transform:uppercase;">Customer Entity</p>
                <p style="margin:4px 0 0 0; font-size:15px; font-weight:700; color:#1E293B;">${clientName}</p>
                <p style="margin:2px 0 0 0; font-size:13px; color:#64748B;">${clientEmail}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid #E2E8F0; padding-top:15px;">
                <table width="100%">
                  <tr>
                    <td>
                      <p style="margin:0; font-size:11px; font-weight:800; color:#94A3B8; text-transform:uppercase;">Total Invoice</p>
                      <p style="margin:4px 0 0 0; font-size:16px; font-weight:700; color:#1E293B;">₦${Number(total).toLocaleString()}</p>
                    </td>
                    <td align="right">
                      <p style="margin:0; font-size:11px; font-weight:800; color:#0028AE; text-transform:uppercase;">Outstanding</p>
                      <p style="margin:4px 0 0 0; font-size:20px; font-weight:800; color:#0028AE;">₦${Number(outstandingBalance).toLocaleString()}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size:13px; color:#64748B; line-height:1.6; margin-bottom:30px;">
          <strong>Action Required:</strong> If you have received this payment, please mark the invoice as <strong>"Paid"</strong> on your dashboard. This will automatically sync with your <span style="color:#0028AE; font-weight:700;">Financial Ledger</span> and update your inventory levels.
        </p>

        <a href="https://quickinvoiceng.com" 
           style="display:inline-block; padding:16px 32px; background:#0F172A; color:#FFFFFF; text-decoration:none; border-radius:14px; font-size:14px; font-weight:700; text-align:center;">
           Update Invoice Status
        </a>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:30px; background:#F8FAFC; border-top: 1px solid #E2E8F0;">
        <p style="margin:0; font-size:10px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:2px;">QuickInvoice Intelligence</p>
        <p style="margin:10px 0 0 0; font-size:11px; color:#94A3B8;">
          Abuja, Nigeria • Automated Cash Flow Tracking
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}


module.exports = generateInvoiceReminderEmail;