import {
  flushRequestAuditSnapshot,
  getRequestAuditOutputDir,
  recordRequestAudit,
} from '../utils/request-audit'

let hasPrintedRequestAuditBanner = false

export default defineNitroPlugin((nitroApp) => {
  if (!hasPrintedRequestAuditBanner) {
    hasPrintedRequestAuditBanner = true
    console.info(`Request audit snapshots will be written to ${getRequestAuditOutputDir()}`)
  }

  nitroApp.hooks.hook('request', (event) => {
    recordRequestAudit(event)
  })

  nitroApp.hooks.hook('close', async () => {
    await flushRequestAuditSnapshot(true)
  })
})
