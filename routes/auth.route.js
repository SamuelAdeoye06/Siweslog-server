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

// Test email configuration in production
router.get('/test-email', async (req, res) => {
  const { getTransporter } = require('../config/mail.config')
  const transporter = await getTransporter()
  try {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new Error('MAIL_USER or MAIL_PASS environment variables are missing')
    }
    const info = await transporter.sendMail({
      from: `"SIWESlog Test" <${process.env.MAIL_USER}>`,
      to: req.query.to || process.env.MAIL_USER,
      subject: 'SIWESlog Nodemailer Test',
      text: 'If you received this, nodemailer is working correctly!'
    })
    res.json({ message: 'Email sent successfully', info })
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to send email', 
      error: error.message,
      stack: error.stack,
      env: {
        MAIL_USER: process.env.MAIL_USER ? 'Set (length: ' + process.env.MAIL_USER.length + ')' : 'Not Set',
        MAIL_PASS: process.env.MAIL_PASS ? 'Set (length: ' + process.env.MAIL_PASS.length + ')' : 'Not Set',
        CLIENT_URL: process.env.CLIENT_URL || 'Not Set'
      }
    })
  }
})

module.exports = router
