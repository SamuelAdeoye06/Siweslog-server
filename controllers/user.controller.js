const User = require('../models/user.model')
const Student = require('../models/student.model')
const { sendSupervisorApprovalEmail } = require('../utils/sendMail')

const getUsers = async (req, res) => {
  const { role } = req.query
  try {
    const filter = { schoolId: req.user.schoolId }
    if (role) filter.role = role
    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })

    // If fetching students, attach student profile data
    if (role === 'student') {
      const userIds = users.map(u => u._id)
      const studentProfiles = await Student.find({ userId: { $in: userIds } })
        .populate('schoolSupervisorId', 'firstName lastName email')
      const profileMap = {}
      studentProfiles.forEach(p => { profileMap[p.userId.toString()] = p })
      const enriched = users.map(u => ({
        ...u.toObject(),
        matricNumber: profileMap[u._id.toString()]?.matricNumber || null,
        department: profileMap[u._id.toString()]?.department || null,
        faculty: profileMap[u._id.toString()]?.faculty || null,
        yearOfStudy: profileMap[u._id.toString()]?.yearOfStudy || null,
        siwesCycleYear: profileMap[u._id.toString()]?.siwesCycleYear || null,
        schoolSupervisor: profileMap[u._id.toString()]?.schoolSupervisorId || null,
        studentStatus: profileMap[u._id.toString()]?.status || null,
      }))
      return res.json({ count: enriched.length, users: enriched })
    }

    res.json({ count: users.length, users })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId
    }).select('-password -refreshToken')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
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

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId
    })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    user.isActive = !user.isActive
    await user.save()
    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const assignSupervisor = async (req, res) => {
  const { supervisorId } = req.body
  try {
    const supervisor = await User.findOne({
      _id: supervisorId,
      schoolId: req.user.schoolId,
      role: 'school_supervisor'
    })
    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' })
    }
    if (supervisor.approvalStatus !== 'approved') {
      return res.status(400).json({ message: 'This supervisor account has not been approved yet' })
    }
    const student = await Student.findOne({
      userId: req.params.studentId,
      schoolId: req.user.schoolId
    })
    if (!student) {
      return res.status(404).json({ message: 'Student not found' })
    }
    student.schoolSupervisorId = supervisorId
    await student.save()
    res.json({ message: 'Supervisor assigned successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getPendingSupervisors = async (req, res) => {
  try {
    const supervisors = await User.find({
      schoolId: req.user.schoolId,
      role: 'school_supervisor',
      approvalStatus: 'pending'
    }).select('-password -refreshToken')
    res.json({ count: supervisors.length, supervisors })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const approveSupervisor = async (req, res) => {
  const { action } = req.body
  try {
    const supervisor = await User.findOne({
      _id: req.params.id,
      schoolId: req.user.schoolId,
      role: 'school_supervisor'
    })
    if (!supervisor) {
      return res.status(404).json({ message: 'Supervisor not found' })
    }
    if (supervisor.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'This account has already been reviewed' })
    }
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either approve or reject' })
    }
    supervisor.approvalStatus = action === 'approve' ? 'approved' : 'rejected'
    await supervisor.save()

    // Send approval email if approved
    if (action === 'approve') {
      sendSupervisorApprovalEmail({
        to: supervisor.email,
        firstName: supervisor.firstName
      }).catch(err => console.error('Supervisor approval email failed:', err.message))
    }

    res.json({
      message: `Supervisor account ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      supervisor: {
        id: supervisor._id,
        firstName: supervisor.firstName,
        lastName: supervisor.lastName,
        email: supervisor.email,
        approvalStatus: supervisor.approvalStatus
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getUsers,
  getUserById,
  toggleUserStatus,
  assignSupervisor,
  getPendingSupervisors,
  approveSupervisor
}
