import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

export async function POST(req: Request) {
  const { email, name, token } = await req.json();

  if (!resend) {
    return Response.json(
      { error: 'E-Mail-Service ist aktuell deaktiviert (kein API-Key)' },
      { status: 503 }
    );
  }

  try {
    const result = await resend.emails.send({
      from: 'noreply@deinedomain.de',
      to: email,
      subject: 'E-Mail bestätigen',
      html: `<p>Hallo ${name},</p>
             <p>Bitte bestätige deine E-Mail, indem du auf folgenden Link klickst:</p>
             <a href="https://deine-domain.de/verifizieren?token=${token}">Jetzt bestätigen</a>`,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: 'E-Mail konnte nicht gesendet werden' },
      { status: 500 }
    );
  }
}
