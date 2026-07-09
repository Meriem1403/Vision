import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "mailpit",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
});

export async function sendLoanAlertEmail(opts: {
  to: string;
  subject: string;
  title: string;
  detail: string;
}) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM ?? "vision@localhost",
    to: opts.to,
    subject: opts.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 520px;">
        <h2 style="color: #2563eb;">Vision Patrimoine</h2>
        <p><strong>${opts.title}</strong></p>
        <p>${opts.detail}</p>
      </div>
    `,
  });
}

export async function verifyMailConnection() {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
