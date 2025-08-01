export async function POST(req: Request) {// Datei notwendig für Weiterleitung von Angebote einholzen zu Auftragsboerse
  const formData = await req.formData()

  // Beispiel-Log zum Test
  const agb = formData.get('agbAccepted')
  console.log('AGB akzeptiert:', agb)

  // Erfolg zurückgeben
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
