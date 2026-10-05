export async function uploadArticleImage(file, originalName) {
  const body = new FormData()
  body.append('file', file, originalName || file.name)
  body.append('folder', 'articles')
  const response = await fetch('/api/media', {method:'POST', body})
  const result = await response.json()
  if (!response.ok || !result.data?.media?.file_url) throw new Error(typeof result.error === 'string' ? result.error : result.error?.message || 'Image upload failed')
  return result.data.media.file_url
}
