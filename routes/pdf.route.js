const express = require('express')
const router = express.Router()
const { generateLogbookPDF } = require('../controllers/pdf.controller')
const { protect, authorizeRoles } = require('../middleware/auth.middleware')

router.use(protect)
router.get('/logbook', authorizeRoles('student'), generateLogbookPDF)

module.exports = router
