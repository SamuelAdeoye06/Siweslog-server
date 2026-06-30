const Student = require('../models/student.model')
const User = require('../models/user.model')
const Placement = require('../models/placement.model')
const WeeklyLog = require('../models/weeklyLog.model')
const SupervisorVisit = require('../models/supervisorVisit.model')

// @desc    Get all students assigned to this supervisor (with placement + log stats)
// @route   GET /api/supervisor/my-students
// @access  school_supervisor
const getMyStudents = async (req, res) => {
  try {
    const students = await Student.find({ schoolSupervisorId: req.user._id })
      .populate('userId', 'firstName lastName email profilePhoto isActive')
      .sort({ createdAt: -1 })

    const studentIds = students.map(s => s._id)

    const [placements, allLogs] = await Promise.all([
      Placement.find({ studentId: { $in: studentIds } })
        .select('studentId companyName companyLocation'),
      WeeklyLog.find({ studentId: { $in: studentIds } })
        .select('studentId status weekNumber')
    ])

    const placementMap = {}
    placements.forEach(p => { placementMap[p.studentId.toString()] = p })

    const logStatsMap = {}
    allLogs.forEach(log => {
      const sid = log.studentId.toString()
      if (!logStatsMap[sid]) {
        logStatsMap[sid] = { total: 0, submitted: 0, industryApproved: 0, schoolApproved: 0, pendingMyReview: 0 }
      }
      logStatsMap[sid].total++
      if (log.status === 'submitted') logStatsMap[sid].submitted++
      if (log.status === 'industry_approved') {
        logStatsMap[sid].industryApproved++
        logStatsMap[sid].pendingMyReview++
      }
      if (log.status === 'school_approved') logStatsMap[sid].schoolApproved++
    })

    const enriched = students.map(s => ({
      ...s.toObject(),
      placement: placementMap[s._id.toString()] || null,
      logStats: logStatsMap[s._id.toString()] || {
        total: 0, submitted: 0, industryApproved: 0, schoolApproved: 0, pendingMyReview: 0
      }
    }))

    res.json({ count: enriched.length, students: enriched })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Get a specific student's placement profile (supervisor read-only view)
// @route   GET /api/supervisor/student/:studentUserId/placement
// @access  school_supervisor
const getStudentPlacement = async (req, res) => {
  try {
    const student = await Student.findOne({
      userId: req.params.studentUserId,
      schoolId: req.user.schoolId
    })
    if (!student) return res.status(404).json({ message: 'Student not found' })

    // Ensure this supervisor is assigned to this student
    if (student.schoolSupervisorId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This student is not assigned to you' })
    }

    const placement = await Placement.findOne({ studentId: student._id })
    res.json({ placement: placement || null, student })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Record a supervisor visit for a student
// @route   POST /api/supervisor/visit
// @access  school_supervisor
const recordVisit = async (req, res) => {
  const { studentUserId, visitDate, generalComments } = req.body
  try {
    if (!studentUserId || !visitDate || !generalComments) {
      return res.status(400).json({ message: 'Student, visit date, and comments are required' })
    }

    const student = await Student.findOne({
      userId: studentUserId,
      schoolId: req.user.schoolId
    })
    if (!student) return res.status(404).json({ message: 'Student not found' })

    if (student.schoolSupervisorId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This student is not assigned to you' })
    }

    const visit = await SupervisorVisit.create({
      studentId: student._id,
      userId: student.userId,
      schoolId: req.user.schoolId,
      supervisorId: req.user._id,
      visitDate: new Date(visitDate),
      generalComments,
      supervisorSignedAt: new Date()
    })

    res.status(201).json({ message: 'Visit recorded successfully', visit })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Get all visits recorded for a student by this supervisor
// @route   GET /api/supervisor/visits/:studentUserId
// @access  school_supervisor
const getStudentVisits = async (req, res) => {
  try {
    const student = await Student.findOne({
      userId: req.params.studentUserId,
      schoolId: req.user.schoolId
    })
    if (!student) return res.status(404).json({ message: 'Student not found' })

    if (student.schoolSupervisorId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This student is not assigned to you' })
    }

    const visits = await SupervisorVisit.find({
      studentId: student._id,
      supervisorId: req.user._id
    }).sort({ visitDate: -1 })

    res.json({ count: visits.length, visits })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getMyStudents,
  getStudentPlacement,
  recordVisit,
  getStudentVisits
}
