const School = require('../models/school.model')
const User = require('../models/user.model')
const Student = require('../models/student.model')

// @desc    Get all schools
// @route   GET /api/super-admin/schools?status=pending_approval
// @access  super_admin
const getAllSchools = async (req, res) => {
  const { status } = req.query
  try {
    const filter = {}
    if (status) filter.approvalStatus = status
    const schools = await School.find(filter).sort({ createdAt: -1 })
    res.json({ count: schools.length, schools })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Get single school with its admin
// @route   GET /api/super-admin/schools/:id
// @access  super_admin
const getSchoolById = async (req, res) => {
  try {
    const school = await School.findById(req.params.id)
    if (!school) {
      return res.status(404).json({ message: 'School not found' })
    }
    const admin = await User.findOne({
      schoolId: school._id,
      role: 'it_admin'
    }).select('-password -refreshToken')

    const studentCount = await Student.countDocuments({ schoolId: school._id })
    const supervisorCount = await User.countDocuments({
      schoolId: school._id,
      role: 'school_supervisor',
      approvalStatus: 'approved'
    })

    res.json({ school, admin, studentCount, supervisorCount })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Approve or suspend a school
// @route   PATCH /api/super-admin/schools/:id/approve
// @access  super_admin
const approveSchool = async (req, res) => {
  const { action, subscriptionPlan } = req.body
  try {
    const school = await School.findById(req.params.id)
    if (!school) {
      return res.status(404).json({ message: 'School not found' })
    }
    if (!['approve', 'suspend'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or suspend' })
    }
    school.approvalStatus = action === 'approve' ? 'approved' : 'suspended'
    school.subscriptionStatus = action === 'approve' ? 'active' : 'suspended'
    if (subscriptionPlan) school.subscriptionPlan = subscriptionPlan
    await school.save()
    if (action === 'suspend') {
      await User.updateMany(
        { schoolId: school._id, role: { $ne: 'super_admin' } },
        { isActive: false }
      )
    } else if (action === 'approve') {
      await User.updateMany(
        { schoolId: school._id, role: { $ne: 'super_admin' } },
        { isActive: true }
      )
    }
    res.json({
      message: `School ${action === 'approve' ? 'approved' : 'suspended'} successfully`,
      school: {
        id: school._id,
        name: school.name,
        approvalStatus: school.approvalStatus,
        subscriptionPlan: school.subscriptionPlan,
        subscriptionStatus: school.subscriptionStatus
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Get platform stats
// @route   GET /api/super-admin/stats
// @access  super_admin
const getStats = async (req, res) => {
  try {
    const [
      totalSchools,
      pendingSchools,
      activeSchools,
      suspendedSchools,
      totalStudents,
      totalSupervisors,
      totalAdmins
    ] = await Promise.all([
      School.countDocuments(),
      School.countDocuments({ approvalStatus: 'pending_approval' }),
      School.countDocuments({ approvalStatus: 'approved' }),
      School.countDocuments({ approvalStatus: 'suspended' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'school_supervisor' }),
      User.countDocuments({ role: 'it_admin' })
    ])

    res.json({
      totalSchools,
      pendingSchools,
      activeSchools,
      suspendedSchools,
      totalStudents,
      totalSupervisors,
      totalAdmins,
      totalUsers: totalStudents + totalSupervisors + totalAdmins
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Get all users across all schools (with filter)
// @route   GET /api/super-admin/users?role=student&schoolId=xxx
// @access  super_admin
const getAllUsers = async (req, res) => {
  const { role, schoolId } = req.query
  try {
    const filter = {}
    if (role) filter.role = role
    if (schoolId) filter.schoolId = schoolId
    const users = await User.find(filter)
      .select('-password -refreshToken')
      .populate('schoolId', 'name slug')
      .sort({ createdAt: -1 })
      .limit(100)
    res.json({ count: users.length, users })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getAllSchools,
  getSchoolById,
  approveSchool,
  getStats,
  getAllUsers
}
