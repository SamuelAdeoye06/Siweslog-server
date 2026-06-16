const User = require('../models/user.model')
const Student = require('../models/student.model')
const { generateOTP, otpExpiry } = require('../utils/otp')
const { sendOTPEmail } = require('../utils/sendMail')
const { cloudinary } = require('../config/cloudinary')

// @desc    Get current user profile
// @route   GET /api/settings/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken -otpCode -otpExpiry -otpPurpose')
      .populate('schoolId', 'name slug registrationCode contactEmail address')

    let studentProfile = null
    if (user.role === 'student') {
      studentProfile = await Student.findOne({ userId: user._id })
        .populate('schoolSupervisorId', 'firstName lastName email')
    }

    res.json({ user, studentProfile })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Update profile (name + phone)
// @route   PATCH /api/settings/update-profile
// @access  Private
const updateProfile = async (req, res) => {
  const { firstName, lastName, phone } = req.body
  try {
    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First name and last name are required' })
    }

    const user = await User.findById(req.user._id)
    user.firstName = firstName.trim()
    user.lastName = lastName.trim()
    if (phone) user.phone = phone.trim()
    await user.save()

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Update profile photo
// @route   PATCH /api/settings/update-photo
// @access  Private
const updatePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' })
    }

    const user = await User.findById(req.user._id)

    // Delete old photo from Cloudinary if one exists
    if (user.profilePhoto) {
      try {
        const publicId = user.profilePhoto.split('/').slice(-2).join('/').split('.')[0]
        await cloudinary.uploader.destroy(publicId)
      } catch (deleteErr) {
        // Non-fatal — old photo deletion failure should not block the new upload
        console.warn('Could not delete old Cloudinary photo:', deleteErr.message)
      }
    }

    const uploadedUrl = req.file.path || req.file.secure_url || req.file.url
    if (!uploadedUrl) {
      return res.status(500).json({ message: 'Upload completed but no photo URL was returned' })
    }

    // multer-storage-cloudinary stores the secure URL on path in this setup.
    user.profilePhoto = uploadedUrl.trim()
    await user.save()

    res.json({
      message: 'Profile photo updated successfully',
      profilePhoto: user.profilePhoto
    })
  } catch (error) {
    console.error('updatePhoto error:', error)
    res.status(500).json({ message: 'Failed to update photo. Please try again.', error: error.message })
  }
}

// @desc    Request password change OTP
// @route   POST /api/settings/request-password-change
// @access  Private
const requestPasswordChange = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const otp = generateOTP()
    user.otpCode = otp
    user.otpExpiry = otpExpiry()
    user.otpPurpose = 'password_change'
    await user.save()

    await sendOTPEmail({
      to: user.email,
      firstName: user.firstName,
      otp,
      purpose: 'password_change'
    })

    res.json({ message: `Verification code sent to ${user.email}` })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Confirm password change with OTP
// @route   PATCH /api/settings/confirm-password-change
// @access  Private
const confirmPasswordChange = async (req, res) => {
  const { otp, newPassword } = req.body
  try {
    if (!otp || !newPassword) {
      return res.status(400).json({ message: 'OTP and new password are required' })
    }

    const user = await User.findById(req.user._id)

    if (!user.otpCode || user.otpPurpose !== 'password_change') {
      return res.status(400).json({ message: 'No password change was requested' })
    }

    if (new Date() > new Date(user.otpExpiry)) {
      user.otpCode = null
      user.otpExpiry = null
      user.otpPurpose = null
      await user.save()
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' })
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
      })
    }

    user.password = newPassword
    user.otpCode = null
    user.otpExpiry = null
    user.otpPurpose = null
    // Invalidate all sessions
    user.refreshToken = ''
    await user.save()

    res.clearCookie('refreshToken')
    res.json({ message: 'Password changed successfully. Please sign in again.' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Request account deletion OTP
// @route   POST /api/settings/request-account-deletion
// @access  Private (students + supervisors only)
const requestAccountDeletion = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!['student', 'school_supervisor'].includes(user.role)) {
      return res.status(403).json({ message: 'Account deletion is not available for your role' })
    }

    const otp = generateOTP()
    user.otpCode = otp
    user.otpExpiry = otpExpiry()
    user.otpPurpose = 'account_deletion'
    await user.save()

    await sendOTPEmail({
      to: user.email,
      firstName: user.firstName,
      otp,
      purpose: 'account_deletion'
    })

    res.json({ message: `Verification code sent to ${user.email}` })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Confirm account deletion with OTP
// @route   DELETE /api/settings/confirm-account-deletion
// @access  Private (students + supervisors only)
const confirmAccountDeletion = async (req, res) => {
  const { otp } = req.body
  try {
    const user = await User.findById(req.user._id)

    if (!['student', 'school_supervisor'].includes(user.role)) {
      return res.status(403).json({ message: 'Account deletion is not available for your role' })
    }

    if (!user.otpCode || user.otpPurpose !== 'account_deletion') {
      return res.status(400).json({ message: 'No account deletion was requested' })
    }

    if (new Date() > new Date(user.otpExpiry)) {
      user.otpCode = null
      user.otpExpiry = null
      user.otpPurpose = null
      await user.save()
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' })
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' })
    }

    // Delete student profile if student
    if (user.role === 'student') {
      await Student.findOneAndDelete({ userId: user._id })
    }

    // Delete user
    await User.findByIdAndDelete(user._id)

    res.clearCookie('refreshToken')
    res.json({ message: 'Account deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getMe,
  updateProfile,
  updatePhoto,
  requestPasswordChange,
  confirmPasswordChange,
  requestAccountDeletion,
  confirmAccountDeletion
}
