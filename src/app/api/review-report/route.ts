import nodemailer from 'nodemailer'

export const runtime = 'nodejs'      // wichtig: Node-Runtime
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { reviewId, reason } = await req.json()

    if (!reviewId || !reason) {
      return new Response('reviewId und reason sind erforderlich', { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // bei Port 465 -> true
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const text = `
Es wurde eine Bewertung gemeldet.

Bewertungs-ID: ${reviewId}

Grund:
${reason}
`.trim()

    await transporter.sendMail({
      from: `"Lackanfragen" <${process.env.REPORT_FROM_EMAIL}>`,
      to: process.env.REPORT_TO_EMAIL, // deine Admin-Adresse
      subject: `Bewertung gemeldet – ID: ${reviewId}`,
      text,
    })

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('Fehler review-report', e)
    return new Response('Serverfehler', { status: 500 })
  }
}
