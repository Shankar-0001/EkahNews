/**
 * Image Upload Utilities
 * Provides image validation, compression, and upload functionality
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_IMAGE_WIDTH = 4000
const MAX_IMAGE_HEIGHT = 4000
const THUMBNAIL_WIDTH = 400
const THUMBNAIL_HEIGHT = 300
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * Validate image file
 */
export const validateImageFile = (file) => {
    const errors = []

    if (!file) {
        return { valid: false, errors: ['No file provided'] }
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        errors.push(`Image type must be one of: ${ALLOWED_IMAGE_TYPES.join(', ')}`)
    }

    if (file.size > MAX_FILE_SIZE) {
        errors.push(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Compress image using canvas
 */
export const compressImage = async (file, maxWidth = 1920, maxHeight = 1920) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const img = new Image()

            img.onload = () => {
                let width = img.width
                let height = img.height

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to compress image'))
                            return
                        }

                        const compressedFile = new File(
                            [blob],
                            `compressed_${Date.now()}.${getFileExt(file.name)}`,
                            { type: file.type }
                        )

                        resolve(compressedFile)
                    },
                    file.type,
                    0.85
                )
            }

            img.onerror = () => {
                reject(new Error('Failed to load image'))
            }

            img.src = e.target.result
        }

        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }

        reader.readAsDataURL(file)
    })
}

/**
 * Generate thumbnail
 */
export const generateThumbnail = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const img = new Image()

            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ratio = Math.min(THUMBNAIL_WIDTH / img.width, THUMBNAIL_HEIGHT / img.height)

                canvas.width = Math.round(img.width * ratio)
                canvas.height = Math.round(img.height * ratio)

                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to generate thumbnail'))
                            return
                        }

                        resolve(blob)
                    },
                    file.type,
                    0.8
                )
            }

            img.onerror = () => {
                reject(new Error('Failed to load image for thumbnail'))
            }

            img.src = e.target.result
        }

        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }

        reader.readAsDataURL(file)
    })
}

/**
 * Get file extension
 */
export const getFileExt = (filename) => {
    return filename.split('.').pop().toLowerCase()
}

/**
 * Generate organized file path in storage
 */
export const generateStoragePath = (category = 'articles', filename) => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${category}/${year}/${month}/${day}/${filename}`
}

/**
 * Get file size in human-readable format
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Extract image dimensions
 */
export const getImageDimensions = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const img = new Image()

            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height,
                })
            }

            img.onerror = () => {
                reject(new Error('Failed to load image'))
            }

            img.src = e.target.result
        }

        reader.onerror = () => {
            reject(new Error('Failed to read file'))
        }

        reader.readAsDataURL(file)
    })
}
