import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// --- Einfaches Rate-Limit im Speicher: 100 Anfragen pro Tag ---
// Achtung: gilt nur pro Server-Instanz (für dich jetzt aber völlig okay).
let requestCount = 0;
let currentDate = new Date().toISOString().slice(0, 10); // z.B. "2025-11-29"

const MAX_REQUESTS_PER_DAY = 100;

export async function POST(req: Request) {
  try {
    // Neuen Tag erkennen -> Zähler zurücksetzen
    const today = new Date().toISOString().slice(0, 10);
    if (today !== currentDate) {
      currentDate = today;
      requestCount = 0;
    }

    // Limit erreicht?
    if (requestCount >= MAX_REQUESTS_PER_DAY) {
      return NextResponse.json(
        {
          error: 'daily_limit_reached',
          message: 'Das tägliche Kontaktlimit wurde erreicht.',
        },
        { status: 429 }
      );
    }

    const { name, email, subject, message, gdpr } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'missing_fields', message: 'Pflichtfelder fehlen.' },
        { status: 400 }
      );
    }

    // nur wenn Pflichtfelder ok sind, Zähler hochzählen
    requestCount++;

    // Nodemailer mit STRATO (Werte aus .env.local)
    const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // bei Port 587 -> false
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});


    const mailText = `Neue Kontaktanfrage über das Formular:

Name: ${name}
E-Mail: ${email}
Betreff: ${subject}
DSGVO akzeptiert: ${gdpr ? 'Ja' : 'Nein'}

Nachricht:
${message}
`;

    await transporter.sendMail({
      from: `"Mein-Shop Kontakt" <${process.env.SMTP_USER}>`,
      to: 'kontakt@mein-shop.com', // Empfänger-Adresse
      replyTo: email,
      subject: `Kontaktformular: ${subject}`,
      text: mailText,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Mail error:', err);
    return NextResponse.json(
      {
        error: 'mail_sending_failed',
        message: 'Versand der E-Mail ist fehlgeschlagen.',
      },
      { status: 500 }
    );
  }
}
