const express = require('express')
const router = express.Router()
const {
  getAllSchools,
  getSchoolById,
  approveSchool,
  getStats,
  getAllUsers
} = require('../controllers/superAdmin.controller')
const { protect, authorizeRoles } = require('../middleware/auth.middleware')

router.use(protect)
router.use(authorizeRoles('super_admin'))

router.get('/stats', getStats)
router.get('/schools', getAllSchools)
router.get('/schools/:id', getSchoolById)
router.patch('/schools/:id/approve', approveSchool)
router.get('/users', getAllUsers)

module.exports = router
