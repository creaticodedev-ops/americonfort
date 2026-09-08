/**
 * Fetch an authenticated PDF, show the real document, then open the print dialog.
 * Avoids the blank-page / parent-page print bug caused by 0×0 hidden iframes.
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

  // Real window (not a hidden iframe) so the user sees the document first.
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    URL.revokeObjectURL(objectUrl)
    throw new Error('Popup blocked — allow popups to print documents')
  }

  const safeTitle = 'Document'
  printWindow.document.open()
  printWindow.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    html, body { margin: 0; height: 100%; background: #525659; }
    embed, iframe { display: block; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <embed id="doc" type="application/pdf" src="${objectUrl}" />
</body>
</html>`)
  printWindow.document.close()

  await new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn) => {
      if (settled) return
      settled = true
      fn()
    }

    const attemptPrint = () => {
      try {
        if (printWindow.closed) {
          finish(() => reject(new Error('Print window was closed')))
          return
        }
        printWindow.focus()
        printWindow.print()
        finish(resolve)
      } catch (error) {
        finish(() => reject(error))
      }
    }

    // Give the PDF embed time to paint the first page before printing.
    const startedAt = Date.now()
    const poll = () => {
      try {
        if (printWindow.closed) {
          finish(() => reject(new Error('Print window was closed')))
          return
        }
      } catch {
        /* ignore */
      }
      if (Date.now() - startedAt >= 800) {
        attemptPrint()
        return
      }
      window.setTimeout(poll, 100)
    }

    window.setTimeout(poll, 300)
    window.setTimeout(attemptPrint, 2200)
  })

  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(objectUrl)
    } catch {
      /* ignore */
    }
  }, 120_000)
}

export default printPdfFromApi
