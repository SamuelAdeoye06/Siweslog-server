const express = require('express')
const router = express.Router()
const {
  getMyLogbook,
  getWeekLog,
  saveLog,
  submitLog,
  uploadAttachment: uploadAttachmentController,
  deleteAttachment,
  getLogByToken,
  approveLogByToken,
  getStudentLogs,
  addSupervisorComment
} = require('../controllers/log.controller')
const { protect, authorizeRoles } = require('../middleware/auth.middleware')
const { uploadAttachment: uploadAttachmentMiddleware } = require('../config/cloudinary')

// Public routes (industry supervisor - no login)
router.get('/approve/:token', getLogByToken)
router.patch('/approve/:token', approveLogByToken)

// Protected routes
router.use(protect)

// Student routes
router.get('/my-logbook', authorizeRoles('student'), getMyLogbook)
router.get('/week/:weekNumber', authorizeRoles('student'), getWeekLog)
router.post('/save', authorizeRoles('student'), saveLog)
router.patch('/:weekNumber/submit', authorizeRoles('student'), submitLog)
router.post('/:weekNumber/attachment', authorizeRoles('student'), uploadAttachmentMiddleware.single('file'), uploadAttachmentController)
router.delete('/:weekNumber/attachment/:attachmentId', authorizeRoles('student'), deleteAttachment)

// Supervisor + admin routes
router.get('/student/:studentUserId', authorizeRoles('school_supervisor', 'it_admin'), getStudentLogs)
router.patch('/:logId/supervisor-comment', authorizeRoles('school_supervisor'), addSupervisorComment)

module.exports = router
