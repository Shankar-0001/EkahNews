/**
 * API Response Formatter - Standardizes all API responses
 * Usage: return apiResponse(200, { user }, null)
 */

export function apiResponse(status, data = null, error = null) {
    return new Response(
        JSON.stringify({
            success: status < 400,
            status,
            ...(data && { data }),
            ...(error && { error }),
            timestamp: new Date().toISOString(),
        }),
        {
            status,
            headers: { 'Content-Type': 'application/json' },
        }
    )
}

/**
 * Safe error serialization for logs
 */
export function serializeError(error) {
    if (error instanceof Error) {
        return {
            message: error.message,
            stack: error.stack,
            name: error.name,
        }
    }
    return { message: String(error) }
}

/**
 * Production-safe logger
 */
export const logger = {
    info: (message, data = {}) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[INFO] ${message}`, data)
        }
    },
    error: (message, error) => {
        console.error(`[ERROR] ${message}`, serializeError(error))
    },
    warn: (message, data = {}) => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[WARN] ${message}`, data)
        }
    },
}
