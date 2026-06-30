const express = require('express')
const router = express.Router()
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notification.controller')
const { protect } = require('../middleware/auth.middleware')

router.use(protect)

router.get('/', getMyNotifications)
router.patch('/read-all', markAllAsRead)
router.patch('/:id/read', markAsRead)
router.delete('/:id', deleteNotification)

module.exports = router
