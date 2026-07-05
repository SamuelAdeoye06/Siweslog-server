const nodemailer = require('nodemailer')

// Using explicit host/port instead of `service: 'gmail'` shorthand.
// The shorthand overrides the `family` option internally, causing Nodemailer
// to resolve smtp.gmail.com to its IPv6 address (2607:f8b0:...) which is
// unreachable on Railway (and many other cloud hosts). Explicit config lets
// `family: 4` actually work, and port 587 (STARTTLS) is far less likely to
// be blocked by cloud providers than port 465 (SSL).
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS — upgraded after connection
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  family: 4 // Force IPv4 — avoids ENETUNREACH on Railway/Render
})

// Verify on startup so misconfiguration is obvious in logs
transporter.verify((error) => {
  if (error) {
    console.error('Nodemailer SMTP connection verification failed:', error.message)
  } else {
    console.log('Nodemailer SMTP connection verified — mail is ready')
  }
})

module.exports = transporter
