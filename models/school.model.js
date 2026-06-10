const mongoose = require('mongoose')

const schoolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
    // e.g "run" for Redeemer's University
  },
  logo: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  contactEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  subscriptionPlan: {
    type: String,
    enum: ['trial', 'basic', 'pro', 'enterprise'],
    default: 'trial'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registrationCode: {
    type: String,
    unique: true,
    default: ''
  },
  approvalStatus: {
    type: String,
    enum: ['pending_approval', 'approved', 'suspended'],
    default: 'pending_approval'
  },
}, { timestamps: true })

module.exports = mongoose.model('School', schoolSchema)