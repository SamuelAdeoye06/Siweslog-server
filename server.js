const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const hpp = require('hpp')
const connectDB = require('./config/db')

dotenv.config()
connectDB()

const app = express()

// CORS must come before everything else — fixes preflight blocking
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}))

// Security headers
app.use(helmet())

// Prevent HTTP parameter pollution
app.use(hpp())

// ── RATE LIMITING ──
// Tuned to accommodate legitimate background polling (dashboard refresh
// every 30s, notification bell every 45s) across multiple open tabs,
// while still blocking real abuse/brute-force patterns.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 400, // generous enough for normal multi-tab usage + polling
  standardHeaders: true, // adds RateLimit-* headers so the frontend can react gracefully
  legacyHeaders: false,
  message: {
    message: 'You are sending requests too quickly. Please wait a few minutes and try again. If this keeps happening, contact support.'
  }
})
app.use('/api', limiter)

// Auth endpoints stay tighter since these are the actual brute-force targets
// (login/registration), not background polling endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // ~1 attempt every 45s sustained, plenty for a real user who mistypes a password a few times
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts. Please wait 15 minutes before trying again, or use "Forgot Password" if you are having trouble signing in.'
  }
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register-student', authLimiter)
app.use('/api/auth/register-supervisor', authLimiter)

app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

// Manual NoSQL injection + XSS protection
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key]
        } else if (typeof obj[key] === 'string') {
          obj[key] = obj[key]
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
        } else {
          sanitize(obj[key])
        }
      })
    }
  }
  if (req.body) sanitize(req.body)
  next()
})

const authRoutes = require('./routes/auth.route')
const settingsRoutes = require('./routes/settings.route')
const logRoutes = require('./routes/log.route')
const placementRoutes = require('./routes/placement.route')
const userRoutes = require('./routes/user.route')
const superAdminRoutes = require('./routes/superAdmin.route')
const supervisorRoutes = require('./routes/supervisor.route')
const pdfRoutes = require('./routes/pdf.route')
const notificationRoutes = require('./routes/notification.route')

app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/placement', placementRoutes)
app.use('/api/users', userRoutes)
app.use('/api/super-admin', superAdminRoutes)
app.use('/api/supervisor', supervisorRoutes)
app.use('/api/pdf', pdfRoutes)
app.use('/api/notifications', notificationRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'SIWESlog API is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
