'use client'

export function getBiliImageSrc (src: string, width = 120, height = 120) {
  return `${src}@${width}w_${height}h_1c`.replace('http://', 'https://')
}
