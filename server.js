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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests from this IP, please try again later' }
})
app.use('/api', limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again later' }
})
app.use('/api/auth/login', authLimiter)
app.use('/api/auth/forgot-password', authLimiter)
app.use('/api/auth/reset-password', authLimiter)
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
const userRoutes = require('./routes/user.route')
const superAdminRoutes = require('./routes/superAdmin.route')

app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/users', userRoutes)
app.use('/api/super-admin', superAdminRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'SIWESlog API is running' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
