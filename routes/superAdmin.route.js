const express = require('express')
const router = express.Router()
const {
  getAllSchools,
  getSchoolById,
  approveSchool,
  getStats,
  getAllUsers,
  toggleAdminStatus,
  deleteSchool
} = require('../controllers/superAdmin.controller')
const { protect, authorizeRoles } = require('../middleware/auth.middleware')

router.use(protect)
router.use(authorizeRoles('super_admin'))

router.get('/stats', getStats)
router.get('/schools', getAllSchools)
router.get('/schools/:id', getSchoolById)
router.patch('/schools/:id/approve', approveSchool)
router.get('/users', getAllUsers)
router.patch('/users/:id/toggle-status', toggleAdminStatus)
router.delete('/schools/:id', deleteSchool)

module.exports = router
