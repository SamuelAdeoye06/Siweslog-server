const mongoose = require('mongoose')

const supervisorVisitSchema = new mongoose.Schema({
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
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  generalComments: {
    type: String,
    required: true
  },
  supervisorSignedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true })

module.exports = mongoose.model('SupervisorVisit', supervisorVisitSchema)
