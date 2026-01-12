import type { ReadableStream } from 'node:stream/web'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { setHeader } from 'h3'

const upstreamUrl = 'http://127.0.0.1:7007/events/stream'

export default defineEventHandler(async (event): Promise<void> => {
  const response = event.node.res
  const abortController = new AbortController()

  const abort = () => {
    abortController.abort()
  }

  event.node.req.on('close', abort)
  event.node.req.on('error', abort)

  let upstreamResponse: Awaited<ReturnType<typeof fetch>>
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: 'text/event-stream',
      },
      signal: abortController.signal,
    })
  }
  catch {
    response.statusCode = 502
    response.end('Upstream stream unavailable.')
    return
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    response.statusCode = upstreamResponse.status
    response.statusMessage = upstreamResponse.statusText
    const message = await upstreamResponse.text()
    response.end(message)
    return
  }

  response.statusCode = upstreamResponse.status
  setHeader(
    event,
    'Content-Type',
    upstreamResponse.headers.get('content-type') ?? 'text/event-stream; charset=utf-8',
  )
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  response.flushHeaders?.()

  const nodeStream = Readable.fromWeb(
    upstreamResponse.body as ReadableStream<Uint8Array>,
  )

  try {
    await pipeline(nodeStream, response)
  }
  catch (error) {
    if (abortController.signal.aborted) {
      return
    }
    throw error
  }
})
