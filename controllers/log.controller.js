const WeeklyLog = require('../models/weeklyLog.model')
const Student = require('../models/student.model')
const User = require('../models/user.model')
const Placement = require('../models/placement.model')
const { cloudinary } = require('../config/cloudinary')
const crypto = require('crypto')
const { notify } = require('../utils/notify')

// ── STUDENT ENDPOINTS ──

const getMyLogbook = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const logs = await WeeklyLog.find({ studentId: student._id }).sort({ weekNumber: 1 })
    res.json({ count: logs.length, logs, student })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getWeekLog = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const log = await WeeklyLog.findOne({
      studentId: student._id,
      weekNumber: parseInt(req.params.weekNumber)
    })

    res.json({ log: log || null, student })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Save/update a weekly log (draft only)
// @route   POST /api/logs/save
// @access  student
const saveLog = async (req, res) => {
  const {
    weekNumber, dateFrom, dateTo,
    dailyActivities, sectionDepartment,
    weeklySummary, studentRemark, detailedReport
  } = req.body

  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const existing = await WeeklyLog.findOne({ studentId: student._id, weekNumber })

    // Block any save once the log has moved past draft — submitted, industry_approved,
    // school_approved, or locked are all off-limits. This is the hard backend guard
    // that protects against any frontend bug (e.g. a stray auto-save timer) reverting
    // a submitted/approved entry back to draft.
    if (existing && (existing.isLocked || existing.status !== 'draft')) {
      return res.status(403).json({
        message: 'This entry has already been submitted and can no longer be edited as a draft'
      })
    }

    const logData = {
      studentId: student._id,
      userId: req.user._id,
      schoolId: req.user.schoolId,
      weekNumber,
      dateFrom,
      dateTo,
      dailyActivities: dailyActivities || {},
      sectionDepartment: sectionDepartment || '',
      weeklySummary: weeklySummary || '',
      studentRemark: studentRemark || '',
      detailedReport: detailedReport || '',
      status: 'draft'
    }

    const log = await WeeklyLog.findOneAndUpdate(
      { studentId: student._id, weekNumber },
      { $set: logData },
      { upsert: true, new: true }
    )

    res.json({ message: 'Log saved successfully', log })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const submitLog = async (req, res) => {
  const { industrySupervisorId } = req.body
  try {
    if (!industrySupervisorId) {
      return res.status(400).json({ message: 'Select which industry supervisor should review this week' })
    }

    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const log = await WeeklyLog.findOne({
      studentId: student._id,
      weekNumber: parseInt(req.params.weekNumber)
    })

    if (!log) return res.status(404).json({ message: 'Log entry not found. Save it first.' })
    if (log.isLocked) return res.status(403).json({ message: 'This entry is already approved and locked' })
    if (log.status !== 'draft') return res.status(400).json({ message: 'This log has already been submitted' })

    const dayValues = log.dailyActivities
    const filledDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      .filter(d => dayValues[d] && dayValues[d].trim().length > 0)

    if (filledDays.length === 0) {
      return res.status(400).json({ message: 'Fill in at least one day of activities before submitting' })
    }

    const placement = await Placement.findOne({ studentId: student._id })
    if (!placement) {
      return res.status(400).json({ message: 'Set up your placement profile before submitting a log' })
    }

    const chosenSupervisor = placement.industrySupervisors.id(industrySupervisorId)
    if (!chosenSupervisor) {
      return res.status(400).json({ message: 'The selected industry supervisor was not found on your profile' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    log.status = 'submitted'
    log.studentSignedAt = new Date()
    log.approvalToken = token
    log.approvalTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    log.approvalVerificationCode = verificationCode
    log.industrySupervisorId = chosenSupervisor._id
    await log.save()

    const approvalLink = `${process.env.CLIENT_URL}/approve-log/${token}`
    const studentName = `${req.user.firstName} ${req.user.lastName}`
    const transporter = await require('../config/mail.config').getTransporter()
    await transporter.sendMail({
      from: `"SIWESlog" <${process.env.MAIL_USER}>`,
      to: chosenSupervisor.email,
      subject: `Week ${log.weekNumber} SIWES Log — Approval Needed`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#F5F7FA;font-family:Arial,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
            <div style="background:#080F1F;padding:24px 32px;">
              <div style="font-size:20px;font-weight:800;color:#fff;">SIWES<span style="color:#4F8EF7;">log</span></div>
            </div>
            <div style="padding:32px;">
              <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px;">Logbook Approval Request</h2>
              <p style="font-size:15px;color:#64748B;line-height:1.65;margin:0 0 8px;">
                <strong>${studentName}</strong> has submitted their <strong>Week ${log.weekNumber}</strong> SIWES logbook entry for your review and approval.
              </p>
              <p style="font-size:14px;color:#64748B;margin:0 0 24px;">
                Period: <strong>${new Date(log.dateFrom).toLocaleDateString('en-GB')} — ${new Date(log.dateTo).toLocaleDateString('en-GB')}</strong>
              </p>
              <a href="${approvalLink}" style="display:inline-block;background:#4F8EF7;color:#fff;padding:13px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:20px;">
                Review &amp; Approve →
              </a>
              <p style="font-size:12px;color:#94A3B8;margin:0;">
                This link expires in 7 days. No account is needed — just click the link to review.
              </p>
            </div>
            <div style="padding:16px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
              © ${new Date().getFullYear()} SIWESlog. All rights reserved.
            </div>
          </div>
        </body></html>
      `
    }).catch(err => console.error('Approval email failed:', err.message))

    res.json({ message: 'Log submitted successfully. Approval link sent to your industry supervisor.', log })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const uploadAttachment = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const log = await WeeklyLog.findOne({
      studentId: student._id,
      weekNumber: parseInt(req.params.weekNumber)
    })

    if (!log) return res.status(404).json({ message: 'Log not found' })
    if (log.isLocked) return res.status(403).json({ message: 'This entry is locked and cannot be modified' })
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    log.attachments.push({
      url: req.file.path,
      publicId: req.file.filename,
      name: req.file.originalname
    })
    await log.save()

    res.json({ message: 'Attachment uploaded', attachments: log.attachments })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const deleteAttachment = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const log = await WeeklyLog.findOne({
      studentId: student._id,
      weekNumber: parseInt(req.params.weekNumber)
    })

    if (!log) return res.status(404).json({ message: 'Log not found' })
    if (log.isLocked) return res.status(403).json({ message: 'This entry is locked' })

    const attachment = log.attachments.id(req.params.attachmentId)
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' })

    await cloudinary.uploader.destroy(attachment.publicId).catch(() => {})
    attachment.deleteOne()
    await log.save()

    res.json({ message: 'Attachment deleted', attachments: log.attachments })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ── INDUSTRY SUPERVISOR ENDPOINTS (no login) ──

const getLogByToken = async (req, res) => {
  try {
    const log = await WeeklyLog.findOne({ approvalToken: req.params.token })
      .populate('userId', 'firstName lastName')
      .populate('schoolId', 'name')

    if (!log) return res.status(404).json({ message: 'Invalid or expired approval link' })
    if (new Date() > new Date(log.approvalTokenExpiry)) {
      return res.status(400).json({ message: 'This approval link has expired' })
    }
    if (log.status !== 'submitted') {
      return res.status(400).json({ message: 'This entry has already been reviewed' })
    }

    res.json({ log })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const approveLogByToken = async (req, res) => {
  const { supervisorName, comment } = req.body
  try {
    const log = await WeeklyLog.findOne({ approvalToken: req.params.token })

    if (!log) return res.status(404).json({ message: 'Invalid or expired approval link' })
    if (new Date() > new Date(log.approvalTokenExpiry)) {
      return res.status(400).json({ message: 'This approval link has expired' })
    }
    if (log.status !== 'submitted') {
      return res.status(400).json({ message: 'This entry has already been reviewed' })
    }
    if (!supervisorName) {
      return res.status(400).json({ message: 'Supervisor name is required' })
    }

    log.status = 'industry_approved'
    log.isLocked = true
    log.industrySupervisorName = supervisorName
    log.industrySupervisorComment = comment || ''
    log.industrySupervisorSignedAt = new Date()
    log.approvalToken = null
    log.approvalTokenExpiry = null
    await log.save()

    // Notify the student their week was approved
    notify({
      userId: log.userId,
      type: 'log_industry_approved',
      message: `${supervisorName} approved your Week ${log.weekNumber} logbook entry`,
      link: `/student/logbook/week/${log.weekNumber}`
    })

    // Notify the assigned school supervisor (if any) that it's now awaiting their sign-off
    const student = await Student.findById(log.studentId).populate('userId', 'firstName lastName')
    if (student?.schoolSupervisorId) {
      notify({
        userId: student.schoolSupervisorId,
        type: 'log_awaiting_school',
        message: `${student.userId.firstName} ${student.userId.lastName}'s Week ${log.weekNumber} has been approved by their industry supervisor and is awaiting your sign-off`,
        link: `/supervisor/students/${student.userId._id}`
      })
    }

    res.json({ message: 'Log approved successfully. Thank you.', weekNumber: log.weekNumber })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ── SCHOOL SUPERVISOR ENDPOINTS ──

const getStudentLogs = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.params.studentUserId })
    if (!student) return res.status(404).json({ message: 'Student not found' })

    const logs = await WeeklyLog.find({ studentId: student._id }).sort({ weekNumber: 1 })
    res.json({ count: logs.length, logs, student })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const addSupervisorComment = async (req, res) => {
  const { comment } = req.body
  try {
    if (!comment) return res.status(400).json({ message: 'Comment is required' })

    const log = await WeeklyLog.findById(req.params.logId)
    if (!log) return res.status(404).json({ message: 'Log not found' })

    if (log.status !== 'industry_approved') {
      return res.status(400).json({ message: 'Industry supervisor must approve this log before you can comment' })
    }

    log.schoolSupervisorId = req.user._id
    log.schoolSupervisorComment = comment
    log.schoolSupervisorSignedAt = new Date()
    log.status = 'school_approved'
    await log.save()

    notify({
      userId: log.userId,
      type: 'log_school_approved',
      message: `${req.user.firstName} ${req.user.lastName} signed off on your Week ${log.weekNumber} logbook entry`,
      link: `/student/logbook/week/${log.weekNumber}`
    })

    res.json({ message: 'Comment added and log signed off', log })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getMyLogbook,
  getWeekLog,
  saveLog,
  submitLog,
  uploadAttachment,
  deleteAttachment,
  getLogByToken,
  approveLogByToken,
  getStudentLogs,
  addSupervisorComment
}