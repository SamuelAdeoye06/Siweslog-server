const express = require('express')
const router = express.Router()
const { registerSchool, registerStudent, registerSupervisor, login, refreshToken, logout } = require('../controllers/auth.controller')
const { protect } = require('../middleware/auth.middleware')

router.post('/register-school', registerSchool)
router.post('/register-student', registerStudent)
router.post('/register-supervisor', registerSupervisor)
router.post('/login', login)
router.post('/refresh', refreshToken)
router.post('/logout', protect, logout)

module.exports = router