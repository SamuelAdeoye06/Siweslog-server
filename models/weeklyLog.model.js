const mongoose = require('mongoose')
const crypto = require('crypto')

const weeklyLogSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  weekNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 52
  },
  dateFrom: {
    type: Date,
    required: true
  },
  dateTo: {
    type: Date,
    required: true
  },

  // Daily activities (Page 4 of physical logbook)
  dailyActivities: {
    monday: { type: String, default: '' },
    tuesday: { type: String, default: '' },
    wednesday: { type: String, default: '' },
    thursday: { type: String, default: '' },
    friday: { type: String, default: '' }
  },

  sectionDepartment: {
    type: String,
    default: ''
  },

  weeklySummary: {
    type: String,
    default: ''
  },

  studentRemark: {
    type: String,
    default: ''
  },

  // Detailed report (Page 5 of physical logbook)
  detailedReport: {
    type: String,
    default: ''
  },

  attachments: [{
    url: { type: String },
    publicId: { type: String },
    name: { type: String }
  }],

  // Student signature
  studentSignedAt: {
    type: Date,
    default: null
  },

  // Industry supervisor approval (tokenized - no login)
  // industrySupervisorId references the _id of the chosen entry inside
  // placement.industrySupervisors at the time the student submitted this
  // specific week — a student may have multiple supervisors over time
  // (e.g. rotated departments), and picks the relevant one per submission.
  industrySupervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  industrySupervisorName: {
    type: String,
    default: null
  },
  industrySupervisorComment: {
    type: String,
    default: ''
  },
  industrySupervisorSignedAt: {
    type: Date,
    default: null
  },
  approvalToken: {
    type: String,
    default: null
  },
  approvalTokenExpiry: {
    type: Date,
    default: null
  },
  approvalVerificationCode: {
    type: String,
    default: null
  },

  // School supervisor comment (after student returns)
  schoolSupervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  schoolSupervisorComment: {
    type: String,
    default: ''
  },
  schoolSupervisorSignedAt: {
    type: Date,
    default: null
  },

  // Overall status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'industry_approved', 'school_approved'],
    default: 'draft'
  },

  // Lock flag - once industry approved, entry is immutable
  isLocked: {
    type: Boolean,
    default: false
  }

}, { timestamps: true })

// Compound index - one log per student per week
weeklyLogSchema.index({ studentId: true, weekNumber: true }, { unique: true })

module.exports = mongoose.model('WeeklyLog', weeklyLogSchema)
