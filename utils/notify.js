const Notification = require('../models/notification.model')

// Centralized helper for creating in-app notifications. Kept deliberately
// simple (no sockets/push yet) — frontend polls/fetches on load and via the
// bell icon. Any controller that triggers an event a user should know about
// calls this instead of writing directly to the Notification model, so the
// shape stays consistent everywhere.
async function notify({ userId, type, message, link = '', meta = {} }) {
  try {
    await Notification.create({ userId, type, message, link, meta })
  } catch (err) {
    // Never let a notification failure break the main request flow
    console.error('Failed to create notification:', err.message)
  }
}

module.exports = { notify }
