const express = require('express')
const router = express.Router()
const {
  getMyStudents,
  getStudentPlacement,
  recordVisit,
  getStudentVisits
} = require('../controllers/supervisor.controller')
const { protect, authorizeRoles } = require('../middleware/auth.middleware')

router.use(protect)
router.use(authorizeRoles('school_supervisor'))

router.get('/my-students', getMyStudents)
router.get('/student/:studentUserId/placement', getStudentPlacement)
router.post('/visit', recordVisit)
router.get('/visits/:studentUserId', getStudentVisits)

module.exports = router
