import { getRequestIP } from 'h3'

// The app runs behind a reverse proxy, so the socket address is always the
// proxy itself and every client would look identical. Resolve the forwarded
// address once per request: `getRequestIP` prefers `context.clientAddress`, so
// every later call site gets it without opting in.
//
// Nitro's `request` hook runs before this middleware, so consumers on that hook
// (see `server/plugins/request-audit.ts`) still have to resolve it themselves.
export default defineEventHandler((event) => {
  const clientAddress = getRequestIP(event, { xForwardedFor: true })
  if (clientAddress) {
    event.context.clientAddress = clientAddress
  }
})
