/**
 * Fetch an authenticated PDF and open the system print dialog directly.
 * Avoids download → open → print.
 */
export const printPdfFromApi = async (axios, url) => {
  const response = await axios.get(url, {
    responseType: 'blob',
    validateStatus: () => true,
  })

  const contentType = String(response.headers?.['content-type'] || '')
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data])

  if (response.status >= 400 || contentType.includes('application/json')) {
    let message = 'PDF print failed'
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

  const pdfBlob = new Blob([blob], { type: 'application/pdf' })
  const objectUrl = URL.createObjectURL(pdfBlob)

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Print document')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.opacity = '0'
    iframe.style.pointerEvents = 'none'

    const cleanup = () => {
      window.setTimeout(() => {
        try {
          URL.revokeObjectURL(objectUrl)
        } catch {
          /* ignore */
        }
        iframe.remove()
      }, 60_000)
    }

    iframe.onload = () => {
      try {
        const frameWindow = iframe.contentWindow
        if (!frameWindow) throw new Error('Print window unavailable')
        frameWindow.focus()
        frameWindow.print()
        resolve()
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }

    iframe.onerror = () => {
      cleanup()
      reject(new Error('Could not load PDF for printing'))
    }

    document.body.appendChild(iframe)
    iframe.src = objectUrl
  })
}

export default printPdfFromApi
