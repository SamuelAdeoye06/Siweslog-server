const User = require('../models/user.model')
const School = require('../models/school.model')
const Student = require('../models/student.model')
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens')
const { validatePassword, validateEmail, validatePhone } = require('../utils/validators')
const jwt = require('jsonwebtoken')

const registerSchool = async (req, res) => {
  const { schoolName, schoolSlug, schoolEmail, schoolAddress, adminFirstName, adminLastName, adminEmail, adminPassword, adminPhone } = req.body
  try {
    // Validate inputs
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message })

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) return res.status(400).json({ message: passwordCheck.message })

    const phoneCheck = validatePhone(phone)
    if (!phoneCheck.valid) return res.status(400).json({ message: phoneCheck.message })
      
    const schoolExists = await School.findOne({ slug: schoolSlug })
    if (schoolExists) {
      return res.status(400).json({ message: 'A school with this slug already exists' })
    }
    const adminExists = await User.findOne({ email: adminEmail })
    if (adminExists) {
      return res.status(400).json({ message: 'An account with this email already exists' })
    }
    const school = await School.create({
      name: schoolName,
      slug: schoolSlug,
      contactEmail: schoolEmail,
      address: schoolAddress,
      approvalStatus: 'pending_approval',
      subscriptionStatus: 'inactive'
    })

    const code = `${schoolSlug.toUpperCase()}-${new Date().getFullYear()}-IT`
    school.registrationCode = code
    await school.save()
    const admin = await User.create({
      schoolId: school._id,
      firstName: adminFirstName,
      lastName: adminLastName,
      email: adminEmail,
      password: adminPassword,
      phone: adminPhone,
      role: 'it_admin'
    })
    res.status(201).json({
      message: 'School registration submitted. Awaiting super admin approval.',
      registrationCode: code,
      school: { id: school._id, name: school.name, slug: school.slug, approvalStatus: school.approvalStatus },
      admin: { id: admin._id, firstName: admin.firstName, lastName: admin.lastName, email: admin.email, role: admin.role }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const registerStudent = async (req, res) => {
  const { registrationCode, firstName, lastName, email, password, phone, matricNumber, department, faculty, yearOfStudy, residentialAddress, healthProblems, siwesCycleYear } = req.body
  try {
    // Validate inputs
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message })

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) return res.status(400).json({ message: passwordCheck.message })

    const phoneCheck = validatePhone(phone)
    if (!phoneCheck.valid) return res.status(400).json({ message: phoneCheck.message })

    const school = await School.findOne({ registrationCode })
    if (!school) {
      return res.status(400).json({ message: 'Invalid registration code' })
    }
    if (school.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        message: 'This school has not been approved yet. Contact your IT admin.' 
      })
    }
    if (!school.isActive) {
      return res.status(400).json({ message: 'This school is not active on SIWESlog' })
    }
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' })
    }
    const matricExists = await Student.findOne({ matricNumber, schoolId: school._id })
    if (matricExists) {
      return res.status(400).json({ message: 'A student with this matric number already exists' })
    }
    const user = await User.create({
      schoolId: school._id,
      firstName,
      lastName,
      email,
      password,
      role: 'student',
      phone
    })
    await Student.create({
      userId: user._id,
      schoolId: school._id,
      matricNumber,
      department,
      faculty,
      yearOfStudy,
      residentialAddress: residentialAddress || '',
      healthProblems: healthProblems || '',
      siwesCycleYear
    })
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)
    user.refreshToken = refreshToken
    await user.save()
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    res.status(201).json({
      message: 'Registration successful',
      accessToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        school: { id: school._id, name: school.name, slug: school.slug }
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const registerSupervisor = async (req, res) => {
  const { registrationCode, firstName, lastName, email, password, phone } = req.body
  try {
    // Validate inputs
    const emailCheck = validateEmail(email)
    if (!emailCheck.valid) return res.status(400).json({ message: emailCheck.message })

    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) return res.status(400).json({ message: passwordCheck.message })

    const phoneCheck = validatePhone(phone)
    if (!phoneCheck.valid) return res.status(400).json({ message: phoneCheck.message })
      
    const school = await School.findOne({ registrationCode })
    if (!school) {
      return res.status(400).json({ message: 'Invalid registration code' })
    }
    if (school.approvalStatus !== 'approved') {
      return res.status(403).json({ 
        message: 'This school has not been approved yet. Contact your IT admin.' 
      })
    }
    if (!school.isActive) {
      return res.status(400).json({ message: 'This school is not active on SIWESlog' })
    }
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' })
    }
    const supervisor = await User.create({
      schoolId: school._id,
      firstName,
      lastName,
      email,
      password,
      role: 'school_supervisor',
      phone,
      approvalStatus: 'pending'
    })
    res.status(201).json({
      message: 'Registration successful. Your account is pending approval by the IT admin.',
      user: {
        id: supervisor._id,
        firstName: supervisor.firstName,
        lastName: supervisor.lastName,
        email: supervisor.email,
        role: supervisor.role,
        approvalStatus: supervisor.approvalStatus
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const login = async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await User.findOne({ email }).populate('schoolId', 'name slug isActive')
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated' })
    }
    if (user.role === 'school_supervisor' && user.approvalStatus === 'pending') {
      return res.status(403).json({ message: 'Your account is pending approval by the IT admin' })
    }
    if (user.role === 'school_supervisor' && user.approvalStatus === 'rejected') {
      return res.status(403).json({ message: 'Your account registration was rejected. Contact your IT admin.' })
    }
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }
    const accessToken = generateAccessToken(user._id)
    const refreshToken = generateRefreshToken(user._id)
    user.refreshToken = refreshToken
    await user.save()
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    })
    res.json({
      accessToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        school: user.schoolId
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) {
    return res.status(401).json({ message: 'No refresh token' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(decoded.id)
    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: 'Invalid refresh token' })
    }
    const newAccessToken = generateAccessToken(user._id)
    res.json({ accessToken: newAccessToken })
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' })
  }
}

const logout = async (req, res) => {
  const token = req.cookies.refreshToken
  if (token) {
    const user = await User.findOne({ refreshToken: token })
    if (user) {
      user.refreshToken = ''
      await user.save()
    }
  }
  res.clearCookie('refreshToken')
  res.json({ message: 'Logged out successfully' })
}

module.exports = { registerSchool, registerStudent, registerSupervisor, login, refreshToken, logout }