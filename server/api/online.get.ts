import { setHeader } from 'h3'
import { onlineCounter } from '~~/server/utils/online-counter'

const HEARTBEAT_MS = 15_000

export default defineEventHandler(async (event): Promise<void> => {
  setHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const response = event.node.res
  response.flushHeaders?.()

  let lastSent: number | null = null
  const sendCount = (count: number) => {
    if (lastSent === count || response.writableEnded || response.destroyed) {
      return
    }
    lastSent = count
    response.write(`data: ${JSON.stringify({ count })}\n\n`)
  }

  const unsubscribe = onlineCounter.subscribe(sendCount)
  const session = await onlineCounter.openSession()
  sendCount(session.count)

  const keepAliveTimer = setInterval(() => {
    if (response.writableEnded || response.destroyed) {
      return
    }
    response.write(':\n\n')
  }, HEARTBEAT_MS)

  const touchTimer = setInterval(() => {
    void onlineCounter.touch(session.id)
  }, HEARTBEAT_MS)

  return await new Promise<void>((resolve) => {
    const cleanup = () => {
      clearInterval(keepAliveTimer)
      clearInterval(touchTimer)
      unsubscribe()
      void onlineCounter.closeSession(session.id)
      resolve()
    }

    event.node.req.on('close', cleanup)
    event.node.req.on('error', cleanup)
  })
})
