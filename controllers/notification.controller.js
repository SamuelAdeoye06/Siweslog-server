const Notification = require('../models/notification.model')

// @desc    Get current user's notifications (most recent first)
// @route   GET /api/notifications?unreadOnly=true&limit=20
// @access  Private (any role)
const getMyNotifications = async (req, res) => {
  try {
    const { unreadOnly, limit } = req.query
    const filter = { userId: req.user._id }
    if (unreadOnly === 'true') filter.isRead = false

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit) : 50)

    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false })

    res.json({ count: notifications.length, unreadCount, notifications })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, userId: req.user._id })
    if (!notification) return res.status(404).json({ message: 'Notification not found' })

    notification.isRead = true
    await notification.save()

    res.json({ message: 'Marked as read', notification })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Mark all of the current user's notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    )
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!notification) return res.status(404).json({ message: 'Notification not found' })
    res.json({ message: 'Notification deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
}
