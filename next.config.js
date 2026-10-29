// Security headers for the try-it page (ADR 0001, #5): contacts never leave the device.
// connect-src 'self' makes the browser block any fetch/XHR/sendBeacon/WebSocket to another
// origin from /essayer; no-referrer keeps the page URL out of requests to other sites.
const ESSAYER_HEADERS = [
  { key: 'Content-Security-Policy', value: "connect-src 'self'" },
  { key: 'Referrer-Policy', value: 'no-referrer' },
]

/** @type {import('next').NextConfig} */
module.exports = {
  experimental: { appDir: true },
  async headers() {
    return [{ source: '/essayer', headers: ESSAYER_HEADERS }]
  },
}
