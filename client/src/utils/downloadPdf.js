/**
 * Download a PDF from an authenticated API endpoint that streams application/pdf
 * (or returns JSON error payloads).
 */
export const downloadPdfFromApi = async (axios, url, filename = 'document.pdf') => {
  const response = await axios.get(url, {
    responseType: 'blob',
    validateStatus: () => true,
  })

  const contentType = String(response.headers?.['content-type'] || '')
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data])

  if (response.status >= 400 || contentType.includes('application/json')) {
    let message = 'PDF download failed'
    try {
      const text = await blob.text()
      const parsed = JSON.parse(text)
      if (parsed?.message) message = parsed.message
    } catch {
      /* keep default */
    }
    const error = new Error(message)
    error.response = { data: { message }, status: response.status }
    throw error
  }

  const objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

export default downloadPdfFromApi
