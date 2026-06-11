const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    default: null
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['student', 'industry_supervisor', 'school_supervisor', 'it_admin', 'super_admin'],
    required: true
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  refreshToken: {
    type: String,
    default: ''
  },
  approvalStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved' 
    // default is approved because students and admins 
    // don't need approval — only supervisors do
  },
  otpCode: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  otpPurpose: {
    type: String,
    enum: ['password_change', 'account_deletion', null],
    default: null
  },
}, { timestamps: true })

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

module.exports = mongoose.model('User', userSchema)