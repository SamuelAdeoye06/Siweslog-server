const mongoose = require('mongoose')

const placementSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyLocation: {
    type: String,
    required: true
  },
  yearOperationBegan: {
    type: String,
    default: ''
  },
  majorAreasOfOperation: {
    type: String,
    default: ''
  },
  productsJobUndertaken: {
    type: String,
    default: ''
  },
  employmentSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'small'
  },
  fullOperation: {
    type: String,
    default: ''
  },
  minorOperation: {
    type: String,
    default: ''
  },
  capitalInvestment: {
    type: String,
    default: ''
  },
  otherRelevantInfo: {
    type: String,
    default: ''
  },
  organogramImage: {
    type: String,
    default: ''
  },
  industrySupervisors: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      isActive: { type: Boolean, default: true },
      assignedFrom: { type: Date, default: Date.now },
      assignedTo: { type: Date, default: null },
      approvalToken: { type: String, default: '' }
    }
  ],
  isApprovedByAdmin: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true })

module.exports = mongoose.model('Placement', placementSchema)
