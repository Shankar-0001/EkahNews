function normalizeEmailList(items = []) {
  return [...new Set(
    (items || [])
      .map((value) => (value || '').toString().trim().toLowerCase())
      .filter(Boolean)
  )]
}

export async function sendEmailToMany({
  to = [],
  subject = '',
  html = '',
  text = '',
}) {
  const recipients = normalizeEmailList(to)
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ALERT_FROM_EMAIL || 'EkahNews Alerts <alerts@EkahNews.com>'

  if (!apiKey || recipients.length === 0) {
    return { sent: false, skipped: true, recipients: recipients.length }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Resend send failed: ${response.status} ${body}`)
  }

  return { sent: true, skipped: false, recipients: recipients.length }
}


