import React, { useState } from 'react'
import { buildImageKitUrl, imageKitSrcSet, isImageKitUrl } from '../utils/imageKitUrl'

/**
 * Responsive image for public car photos.
 * ImageKit: width srcset + f-auto (AVIF/WebP). Local/other: plain src.
 */
const ResponsiveImage = ({
  src,
  alt,
  widths = [400, 640, 960, 1280],
  sizes,
  width,
  height,
  className,
  loading = 'lazy',
  fetchPriority,
  decoding = 'async',
  fallbackSrc,
  onError,
}) => {
  const [failed, setFailed] = useState(false)
  const effective = failed && fallbackSrc ? fallbackSrc : src
  const useIk = isImageKitUrl(effective)
  const srcSet = useIk ? imageKitSrcSet(effective, widths) : undefined
  const resolvedSrc = useIk
    ? buildImageKitUrl(effective, { width: widths[widths.length - 1] || 1280 })
    : effective

  return (
    <img
      src={resolvedSrc || fallbackSrc || ''}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      className={className}
      onError={(e) => {
        if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
          setFailed(true)
          e.currentTarget.src = fallbackSrc
          e.currentTarget.removeAttribute('srcset')
        }
        onError?.(e)
      }}
    />
  )
}

export default ResponsiveImage
