const School = require('../models/school.model')
const User = require('../models/user.model')
const Student = require('../models/student.model')
const { sendSchoolApprovalEmail } = require('../utils/sendMail')

const getAllSchools = async (req, res) => {
  const { status, search } = req.query
  try {
    const filter = {}
    if (status) filter.approvalStatus = status
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } }
      ]
    }
    const schools = await School.find(filter).sort({ createdAt: -1 })
    res.json({ count: schools.length, schools })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getSchoolById = async (req, res) => {
  try {
    const school = await School.findById(req.params.id)
    if (!school) return res.status(404).json({ message: 'School not found' })

    const admin = await User.findOne({
      schoolId: school._id, role: 'it_admin'
    }).select('-password -refreshToken')

    const studentCount = await Student.countDocuments({ schoolId: school._id })
    const supervisorCount = await User.countDocuments({
      schoolId: school._id, role: 'school_supervisor', approvalStatus: 'approved'
    })

    res.json({ school, admin, studentCount, supervisorCount })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const approveSchool = async (req, res) => {
  const { action, subscriptionPlan } = req.body
  try {
    const school = await School.findById(req.params.id)
    if (!school) return res.status(404).json({ message: 'School not found' })

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
      const admin = await User.findOne({ schoolId: school._id, role: 'it_admin' })
      if (admin) {
        sendSchoolApprovalEmail({
          to: admin.email,
          firstName: admin.firstName,
          schoolName: school.name,
          registrationCode: school.registrationCode
        }).catch(err => console.error('School approval email failed:', err.message))
      }
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

const getStats = async (req, res) => {
  try {
    const [
      totalSchools, pendingSchools, activeSchools, suspendedSchools,
      totalStudents, totalSupervisors, totalAdmins
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
      totalSchools, pendingSchools, activeSchools, suspendedSchools,
      totalStudents, totalSupervisors, totalAdmins,
      totalUsers: totalStudents + totalSupervisors + totalAdmins
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getAllUsers = async (req, res) => {
  const { role, schoolId, search } = req.query
  try {
    const filter = {}
    if (role) filter.role = role
    if (schoolId) filter.schoolId = schoolId
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
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

const toggleAdminStatus = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'it_admin' })
    if (!user) return res.status(404).json({ message: 'IT Admin not found' })
    user.isActive = !user.isActive
    await user.save()
    res.json({
      message: `IT Admin ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: user.isActive
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const deleteSchool = async (req, res) => {
  try {
    const school = await School.findById(req.params.id)
    if (!school) return res.status(404).json({ message: 'School not found' })
    await User.deleteMany({ schoolId: school._id })
    await Student.deleteMany({ schoolId: school._id })
    await School.findByIdAndDelete(req.params.id)
    res.json({ message: 'School and all associated data deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getAllSchools, getSchoolById, approveSchool, getStats,
  getAllUsers, toggleAdminStatus, deleteSchool
}
