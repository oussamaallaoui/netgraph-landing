// Security headers (ADR 0001, #5): contacts never leave the device.
// connect-src 'self' makes the browser block any fetch/XHR/sendBeacon/WebSocket to another
// origin; no-referrer keeps our URLs out of requests to other sites.
// Served on every route, not only /essayer: next/link loads /essayer by client-side
// navigation inside the document of the page the visitor came from (e.g. '/'), and the
// CSP that applies is that document's.
const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: "connect-src 'self'" },
  { key: 'Referrer-Policy', value: 'no-referrer' },
]

/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { appDir: true },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }]
  },
}
