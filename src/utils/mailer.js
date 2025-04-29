// api/src/utils/mailer.js
import { MailerSend, Recipient, EmailParams } from "mailersend";

const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_TOKEN,
});

export async function sendMail({
  to,
  subject,
  html,
  text,
  from = "carlos@taita.blog",
  fromName = "Taita Blog",
}) {
  const recipients = [new Recipient(to, to)];
  const emailParams = new EmailParams({
    from: { email: from, name: fromName },
    to: recipients,
    subject,
    html,
    text,
  });

  try {
    const response = await mailersend.email.send(emailParams);
    return response;
  } catch (error) {
    console.error("Error enviando email:", error);
    throw error;
  }
}
