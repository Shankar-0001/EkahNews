function isAbortError(error) {
  const message = String(error?.message || '')
  return error?.name === 'AbortError' || error?.code === 20 || /AbortError|aborted/i.test(message)
}

function isConnectivityError(error) {
  const message = String(error?.message || '')
  return /fetch failed|network|timeout|connect/i.test(message)
}

export function isDatabaseUnavailableError(error) {
  return isAbortError(error) || isConnectivityError(error)
}

async function runWithTimeout(buildQuery, { timeoutMs = 5000 } = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await buildQuery(controller.signal)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function runListQuery(buildQuery, { timeoutMs = 5000, label = 'supabase-list' } = {}) {
  try {
    const { data, error, count } = await runWithTimeout(
      (signal) => buildQuery(signal),
      { timeoutMs }
    )

    if (error) {
      if (isDatabaseUnavailableError(error)) {
        console.error(`[${label}] Supabase unreachable - check if project is paused`)
        return { data: [], count: 0, unavailable: true }
      }

      console.error(`[${label}] Supabase error:`, error.message || error)
      return { data: [], count: typeof count === 'number' ? count : 0, unavailable: false }
    }

    return { data: data || [], count: typeof count === 'number' ? count : 0, unavailable: false }
  } catch (error) {
    if (isAbortError(error)) {
      console.error(`[${label}] Supabase timeout - is project paused?`)
    } else {
      console.error(`[${label}] Fetch failed:`, error.message || error)
    }

    return { data: [], count: 0, unavailable: isDatabaseUnavailableError(error) }
  }
}

export async function runSingleQuery(buildQuery, {
  timeoutMs = 5000,
  label = 'supabase-single',
  throwOnUnavailable = false,
} = {}) {
  try {
    const { data, error } = await runWithTimeout(
      (signal) => buildQuery(signal),
      { timeoutMs }
    )

    if (error) {
      if (isDatabaseUnavailableError(error)) {
        console.error(`[${label}] Supabase unreachable - check if project is paused`)
        if (throwOnUnavailable) {
          throw new Error('DATABASE_UNAVAILABLE')
        }
        return null
      }

      const message = error.message || ''
      const isNotFound = /0 rows|no rows|multiple|JSON object requested/i.test(message)
      if (!isNotFound) {
        console.error(`[${label}] Supabase error:`, message)
      }
      return null
    }

    return data || null
  } catch (error) {
    if (error?.message === 'DATABASE_UNAVAILABLE') {
      throw error
    }

    if (isDatabaseUnavailableError(error)) {
      console.error(`[${label}] Supabase unreachable - check if project is paused`)
      if (throwOnUnavailable) {
        throw new Error('DATABASE_UNAVAILABLE')
      }
      return null
    }

    console.error(`[${label}] Error:`, error.message || error)
    throw error
  }
}
