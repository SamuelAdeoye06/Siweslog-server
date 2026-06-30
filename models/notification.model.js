const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'log_industry_approved',       // student: your week was approved by industry supervisor
      'log_school_approved',         // student: your week was signed off by school supervisor
      'log_awaiting_school',         // school_supervisor: a student's week is industry-approved and awaiting your sign-off
      'supervisor_approved',         // school_supervisor: your account was approved by IT admin
      'supervisor_pending',          // it_admin: a new supervisor is awaiting approval
      'supervisor_assigned_student', // school_supervisor: you've been assigned to a new student
      'school_approved',             // it_admin: your school was approved by super admin
      'school_pending_approval',     // super_admin: a new school registered and needs approval
      'student_registered',          // it_admin: a new student registered using the school's code
      'placement_supervisor_added',  // student: confirmation that a supervisor was added to their profile
    ],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true })

notificationSchema.index({ userId: 1, createdAt: -1 })

module.exports = mongoose.model('Notification', notificationSchema)
