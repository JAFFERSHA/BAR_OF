import nodemailer from 'nodemailer';

interface BillDetails {
  saleId: string;
  customer: string;
  barName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  billedAt: string;
}

/* ── Gmail SMTP transporter ── */
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

/* ── Send Bill Email via Gmail ── */
export async function sendBillEmail(to: string, bill: BillDetails): Promise<void> {
  const itemRows = bill.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a">${i.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;text-align:center">${i.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a3a;text-align:right">${bill.currency}${(i.quantity * i.unitPrice).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Your Bill</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;color:#1a1a2e">
  <div style="max-width:520px;margin:32px auto;background:#1a1d2e;border-radius:16px;overflow:hidden;border:1px solid #2a2a3a">

    <div style="background:linear-gradient(135deg,#f9b248,#e09a2a);padding:24px 32px">
      <h1 style="margin:0;font-size:20px;color:#0f1117">🍺 ${bill.barName}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#1a1208">Thank you for visiting! Here is your bill.</p>
    </div>

    <div style="padding:24px 32px;color:#e2e8f0">
      <table style="width:100%;font-size:13px;margin-bottom:16px">
        <tr>
          <td style="color:#94a3b8">Bill ID</td>
          <td style="text-align:right;font-weight:600;color:#f9b248">#${bill.saleId.slice(-8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8">Customer</td>
          <td style="text-align:right;font-weight:600">${bill.customer}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8">Date</td>
          <td style="text-align:right;color:#94a3b8">${bill.billedAt}</td>
        </tr>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#252838">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">Item</th>
            <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">Qty</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #2a2a3a">
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#94a3b8;margin-bottom:6px">
          <span>Subtotal</span><span>${bill.currency}${bill.subtotal.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;color:#94a3b8;margin-bottom:10px">
          <span>Tax</span><span>${bill.currency}${bill.tax.toFixed(2)}</span>
        </div>
        <table style="width:100%">
          <tr>
            <td style="font-size:18px;font-weight:800;color:#f9b248">Total</td>
            <td style="font-size:18px;font-weight:800;color:#f9b248;text-align:right">${bill.currency}${bill.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="padding:16px 32px;background:#13151f;font-size:12px;color:#475569;text-align:center">
      ${bill.barName} · Powered by Bar Ops
    </div>
  </div>
</body>
</html>`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${bill.barName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `Your bill from ${bill.barName} — ${bill.currency}${bill.total.toFixed(2)}`,
    html,
  });
}

/* ── Send Bill SMS via Fast2SMS ── */
export async function sendBillSMS(phone: string, bill: BillDetails): Promise<void> {
  const cleaned = phone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
  if (cleaned.length !== 10) return;

  const message = `${bill.barName}\nBill #${bill.saleId.slice(-8).toUpperCase()}\nCustomer: ${bill.customer}\nTotal: ${bill.currency}${bill.total.toFixed(2)}\nThank you for visiting!`;

  const params = new URLSearchParams({
    route: 'q',
    message,
    language: 'english',
    flash: '0',
    numbers: cleaned,
  });

  const res = await fetch(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`, {
    method: 'GET',
    headers: { authorization: process.env.FAST2SMS_API_KEY ?? '' },
  });

  if (!res.ok) {
    console.error('Fast2SMS error:', await res.text());
  }
}
