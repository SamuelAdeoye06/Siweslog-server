const express = require('express')
const router = express.Router()
const {
  registerSchool,
  registerStudent,
  registerSupervisor,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  resetPassword
} = require('../controllers/auth.controller')
const { protect } = require('../middleware/auth.middleware')

router.post('/register-school', registerSchool)
router.post('/register-student', registerStudent)
router.post('/register-supervisor', registerSupervisor)
router.post('/login', login)
router.post('/forgot-password', requestPasswordReset)
router.patch('/reset-password', resetPassword)
router.post('/refresh', refreshToken)
router.post('/logout', protect, logout)

// Test email — hit GET /api/auth/test-email?to=you@email.com to verify Resend works
router.get('/test-email', async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'RESEND_API_KEY is not set in environment variables' })
    }
    const { sendMail } = require('../utils/sendMail')
    // sendMail is not exported directly — import the low-level helper
    const { Resend } = require('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const to = req.query.to || 'test@example.com'
    const { data, error } = await resend.emails.send({
      from: process.env.MAIL_FROM || 'SIWESlog <onboarding@resend.dev>',
      to,
      subject: 'SIWESlog — Email Test',
      html: '<p>If you received this, Resend is working correctly on your deployment.</p>'
    })
    if (error) return res.status(500).json({ success: false, error })
    res.json({ success: true, message: `Test email sent to ${to}`, id: data?.id })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})


module.exports = router
