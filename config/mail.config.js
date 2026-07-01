const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  // Force IPv4 — some hosts (Railway included) route Gmail SMTP's IPv6
  // address (smtp.gmail.com resolving to a 2607:f8b0:... address) through
  // an unreachable network path, causing every send to fail with
  // ENETUNREACH. Forcing the connection through IPv4 avoids that entirely.
  family: 4
})

// Verify nodemailer configuration on startup to log diagnostics
transporter.verify((error, success) => {
  if (error) {
    console.error('Nodemailer SMTP connection verification failed:', error.message)
  } else {
    console.log('Nodemailer SMTP connection verified successfully!')
  }
})

module.exports = transporter
