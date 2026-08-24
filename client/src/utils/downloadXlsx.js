/**
 * Download an authenticated XLSX export (or surface JSON API errors).
 */
export const downloadXlsxFromApi = async (
  axios,
  url,
  {
    fallbackName = 'report.xlsx',
    params,
  } = {},
) => {
  const response = await axios.get(url, {
    params,
    responseType: 'blob',
    validateStatus: () => true,
  })

  const contentType = String(response.headers?.['content-type'] || '')
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data])

  if (response.status >= 400 || contentType.includes('application/json')) {
    let message = 'Export failed'
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

  const disposition = String(response.headers?.['content-disposition'] || '')
  const matched = disposition.match(/filename="?([^"]+)"?/i)
  const filename = matched?.[1] || fallbackName

  const objectUrl = URL.createObjectURL(
    new Blob([blob], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
  return filename
}

export default downloadXlsxFromApi
