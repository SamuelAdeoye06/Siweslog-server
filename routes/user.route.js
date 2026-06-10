const express = require('express')
const router = express.Router()
const { getUsers, getUserById, toggleUserStatus, assignSupervisor, getPendingSupervisors, approveSupervisor } = require('../controllers/user.controller')
const { protect, authorizeRoles } = require('../middleware/auth.middleware')

router.use(protect)
router.use(authorizeRoles('it_admin', 'super_admin'))

router.get('/', getUsers)
router.get('/pending-supervisors', getPendingSupervisors)
router.get('/:id', getUserById)
router.patch('/:id/toggle-status', toggleUserStatus)
router.patch('/:id/approve', approveSupervisor)
router.patch('/:studentId/assign-supervisor', assignSupervisor)

module.exports = router