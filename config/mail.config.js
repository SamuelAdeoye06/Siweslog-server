const dns = require('dns')
const nodemailer = require('nodemailer')

// ── WHY THIS EXISTS ───────────────────────────────────────────────────────────
//
// Nodemailer v8 introduced randomised address selection in lib/shared.js:
//
//   const host = addresses[Math.floor(Math.random() * addresses.length)]
//
// It resolves smtp.gmail.com to both IPv4 and IPv6 addresses (because Railway
// containers have an IPv6 network interface, even though it cannot actually
// reach the internet), then picks one at random. When it picks IPv6 you get:
//
//   ENETUNREACH 2607:f8b0:...:587 - Local (:::0)
//
// The `family: 4` option at the transport level is silently ignored — smtp-
// connection has zero references to "family" in its source. dns.setDefault-
// ResultOrder('ipv4first') also doesn't help because nodemailer uses
// dns.resolve4/resolve6 directly, not dns.lookup.
//
// THE FIX: nodemailer has one escape hatch — if `host` is already a raw IP
// address, net.isIP(host) returns truthy and nodemailer skips resolveHostname
// entirely. No DNS resolution, no random selection, straight TCP to that IP.
// We pre-resolve smtp.gmail.com to an IPv4 address using dns.resolve4 (which
// only ever returns A records) and pass that IP directly as `host`.
//
// ─────────────────────────────────────────────────────────────────────────────

const buildTransporter = (host) => nodemailer.createTransport({
  host,   // raw IPv4 → nodemailer skips its own DNS resolution completely
  port: 587,
  secure: false, // STARTTLS — upgraded after connection, works on Railway/Render
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS   // must be a Gmail App Password, not your login password
  }
})

// Kick off IPv4 resolution immediately on module load.
// dns.resolve4 only queries A records — no AAAA, no randomness.
const transporterPromise = new Promise((resolve) => {
  dns.resolve4('smtp.gmail.com', (err, addresses) => {
    if (err || !addresses || !addresses.length) {
      // Fallback to hostname — at least port 587 is correct and Railway
      // might get lucky with IPv4 on the plain hostname path
      console.warn('Mail: dns.resolve4 failed, falling back to hostname:', err?.message)
      resolve(buildTransporter('smtp.gmail.com'))
      return
    }

    const ip = addresses[0]
    console.log(`Mail: smtp.gmail.com resolved to ${ip} (IPv4) — nodemailer DNS bypassed`)
    const t = buildTransporter(ip)

    t.verify((verifyErr) => {
      if (verifyErr) {
        console.error('Nodemailer SMTP verification failed:', verifyErr.message)
      } else {
        console.log('Nodemailer SMTP connection verified — mail is ready')
      }
    })

    resolve(t)
  })
})

// getTransporter() is async because the DNS resolution is async.
// All callers (sendMail.js) await this — it resolves almost instantly
// since dns.resolve4 completes in milliseconds on startup.
const getTransporter = () => transporterPromise

module.exports = { getTransporter }
