import { sendEmailToMany } from '@/lib/email-utils'

const DEFAULT_THRESHOLD = 1000
const DEFAULT_TOPIC_SAMPLE = 120
const DEFAULT_ARTICLE_SAMPLE = 500

function toLower(value = '') {
  return (value || '').toString().toLowerCase().trim()
}

function includesKeyword(article = {}, keyword = '') {
  const haystack = `${article.title || ''} ${article.excerpt || ''} ${article.content || ''}`.toLowerCase()
  return haystack.includes(toLower(keyword))
}

function getThreshold() {
  const raw = Number.parseInt(process.env.TREND_ALERT_VIEWS_THRESHOLD || '', 10)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_THRESHOLD
}

function formatHoursAgo(createdAt) {
  if (!createdAt) return 'unknown'
  const hours = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)))
  return `${hours}h ago`
}

async function getRecipients(admin) {
  const { data: users } = await admin
    .from('users')
    .select('email, role')
    .in('role', ['admin', 'author'])

  return [...new Set((users || []).map((u) => (u.email || '').trim()).filter(Boolean))]
}

async function loadAlertRows(admin) {
  const { data } = await admin
    .from('trend_topic_alerts')
    .select('topic_slug, first_seen_at, alerted_at, last_seen_views')
  return data || []
}

async function computeTopicViewTotals(admin, topics = []) {
  const { data: articles } = await admin
    .from('articles')
    .select('id, title, excerpt, content')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(DEFAULT_ARTICLE_SAMPLE)

  const articleIds = (articles || []).map((a) => a.id).filter(Boolean)
  let engagementRows = []

  if (articleIds.length > 0) {
    const { data } = await admin
      .from('article_engagement')
      .select('article_id, views')
      .in('article_id', articleIds)
      .limit(Math.min(articleIds.length, DEFAULT_ARTICLE_SAMPLE))
    engagementRows = data || []
  }

  const viewsByArticle = new Map((engagementRows || []).map((row) => [row.article_id, row.views || 0]))
  const totals = new Map()

  for (const topic of topics) {
    const keyword = topic.keyword || topic.slug || ''
    let sum = 0
    for (const article of articles || []) {
      if (includesKeyword(article, keyword)) {
        sum += viewsByArticle.get(article.id) || 0
      }
    }
    totals.set(topic.slug, sum)
  }

  return totals
}

export async function processTrendAlerts(admin, topics = []) {
  const threshold = getThreshold()
  const candidates = (topics || []).slice(0, DEFAULT_TOPIC_SAMPLE)
  if (candidates.length === 0) {
    return {
      threshold,
      checked: 0,
      triggered: 0,
      emailed: false,
      recipients: 0,
    }
  }

  const [alertRows, topicViews] = await Promise.all([
    loadAlertRows(admin),
    computeTopicViewTotals(admin, candidates),
  ])

  const alertMap = new Map((alertRows || []).map((row) => [row.topic_slug, row]))
  const nowIso = new Date().toISOString()

  const triggered = []
  const upsertRows = []

  for (const topic of candidates) {
    const row = alertMap.get(topic.slug)
    const views = topicViews.get(topic.slug) || 0
    const alreadyAlerted = Boolean(row?.alerted_at)
    const crossing = views >= threshold && !alreadyAlerted

    upsertRows.push({
      topic_slug: topic.slug,
      topic_keyword: topic.keyword,
      first_seen_at: row?.first_seen_at || topic.created_at || nowIso,
      last_seen_views: views,
      alerted_at: crossing ? nowIso : row?.alerted_at || null,
      updated_at: nowIso,
    })

    if (crossing) {
      triggered.push({
        ...topic,
        views,
      })
    }
  }

  await admin.from('trend_topic_alerts').upsert(upsertRows, { onConflict: 'topic_slug' })

  if (triggered.length === 0) {
    return {
      threshold,
      checked: candidates.length,
      triggered: 0,
      emailed: false,
      recipients: 0,
    }
  }

  const recipients = await getRecipients(admin)
  const subject = `Trend Alert: ${triggered.length} topic(s) crossed ${threshold} views`
  const listHtml = triggered
    .slice(0, 12)
    .map((t) => `<li><strong>${t.keyword}</strong> - ${t.views} views - started ${formatHoursAgo(t.created_at)}</li>`)
    .join('')

  const html = `
    <h2>EkahNews Trend Alert</h2>
    <p>New web trend topic(s) crossed <strong>${threshold}</strong> views.</p>
    <ul>${listHtml}</ul>
    <p>Generated at: ${new Date().toISOString()}</p>
  `
  const text = triggered
    .slice(0, 12)
    .map((t) => `${t.keyword}: ${t.views} views, started ${formatHoursAgo(t.created_at)}`)
    .join('\n')

  const mailResult = await sendEmailToMany({
    to: recipients,
    subject,
    html,
    text: `EkahNews Trend Alert\n${text}`,
  })

  return {
    threshold,
    checked: candidates.length,
    triggered: triggered.length,
    emailed: Boolean(mailResult?.sent),
    recipients: mailResult?.recipients || 0,
  }
}

