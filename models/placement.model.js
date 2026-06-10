const mongoose = require('mongoose')

const studentSchema = new mongoose.Schema({
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
  matricNumber: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  faculty: {
    type: String,
    required: true,
    trim: true
  },
  yearOfStudy: {
    type: String,
    required: true,
    trim: true
  },
  residentialAddress: {
    type: String,
    default: ''
  },
  healthProblems: {
    type: String,
    default: ''
  },
  siwesCycleYear: {
    type: String,
    required: true // e.g "2024/2025"
  },
  schoolSupervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  }
}, { timestamps: true })

module.exports = mongoose.model('Student', studentSchema)