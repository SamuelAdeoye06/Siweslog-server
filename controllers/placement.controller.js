const Placement = require('../models/placement.model')
const Student = require('../models/student.model')
const { cloudinary } = require('../config/cloudinary')
const { sendIndustrySupervisorAddedEmail } = require('../utils/sendMail')
const { notify } = require('../utils/notify')

// @desc    Get student's placement profile
// @route   GET /api/placement/my-placement
// @access  student
const getMyPlacement = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const placement = await Placement.findOne({ studentId: student._id })
    res.json({
      placement: placement || null,
      siwesDurationWeeks: student.siwesDurationWeeks,
      isPlacementComplete: !!placement // company profile exists = setup complete
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Create or update placement / company profile
// @route   POST /api/placement/save
// @access  student
const savePlacement = async (req, res) => {
  const {
    companyName, companyLocation, yearOperationBegan,
    majorAreasOfOperation, productsJobUndertaken,
    employmentSize, fullOperation, minorOperation,
    capitalInvestment, otherRelevantInfo
  } = req.body

  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    if (!companyName || !companyLocation) {
      return res.status(400).json({ message: 'Company name and location are required' })
    }

    const existing = await Placement.findOne({ studentId: student._id })

    const placementData = {
      studentId: student._id,
      schoolId: req.user.schoolId,
      companyName,
      companyLocation,
      yearOperationBegan: yearOperationBegan || '',
      majorAreasOfOperation: majorAreasOfOperation || '',
      productsJobUndertaken: productsJobUndertaken || '',
      employmentSize: employmentSize || 'small',
      fullOperation: fullOperation || '',
      minorOperation: minorOperation || '',
      capitalInvestment: capitalInvestment || '',
      otherRelevantInfo: otherRelevantInfo || '',
    }

    let placement
    if (existing) {
      Object.assign(existing, placementData)
      placement = await existing.save()
    } else {
      placement = await Placement.create(placementData)
    }

    if (student.status === 'pending') {
      student.status = 'active'
      await student.save()
    }

    res.json({ message: 'Company profile saved successfully', placement })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Add a new industry supervisor (student can have multiple over time)
// @route   POST /api/placement/supervisors
// @access  student
const addIndustrySupervisor = async (req, res) => {
  const { name, email, phone } = req.body
  try {
    if (!name || !email || !phone) {
      return res.status(400).json({ message: 'Supervisor name, email and phone are all required' })
    }

    const student = await Student.findOne({ userId: req.user._id }).populate('userId', 'firstName lastName')
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const placement = await Placement.findOne({ studentId: student._id })
    if (!placement) {
      return res.status(400).json({ message: 'Save your company profile first before adding a supervisor' })
    }

    placement.industrySupervisors.push({
      name, email, phone,
      isActive: true,
      assignedFrom: new Date()
    })
    await placement.save()

    const studentName = `${student.userId.firstName} ${student.userId.lastName}`
    sendIndustrySupervisorAddedEmail({
      to: email,
      supervisorName: name,
      studentName,
      companyName: placement.companyName
    }).catch(err => console.error('Supervisor added email failed:', err.message))

    // Quiet confirmation to the student themselves that the supervisor was added
    notify({
      userId: req.user._id,
      type: 'placement_supervisor_added',
      message: `${name} was added as your industry supervisor and has been notified by email`,
      link: '/student/placement'
    })

    res.json({ message: 'Industry supervisor added successfully', placement })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Remove/deactivate an industry supervisor
// @route   DELETE /api/placement/supervisors/:supervisorId
// @access  student
const removeIndustrySupervisor = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const placement = await Placement.findOne({ studentId: student._id })
    if (!placement) return res.status(404).json({ message: 'Placement not found' })

    const supervisor = placement.industrySupervisors.id(req.params.supervisorId)
    if (!supervisor) return res.status(404).json({ message: 'Supervisor not found' })

    // We never hard-delete — past weeks may reference this supervisor by id.
    // Mark inactive instead so it drops out of the "active" list but stays
    // valid for historical log entries.
    supervisor.isActive = false
    supervisor.assignedTo = new Date()
    await placement.save()

    res.json({ message: 'Supervisor removed from your active list', placement })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Upload organogram image
// @route   PATCH /api/placement/organogram
// @access  student
const uploadOrganogram = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id })
    if (!student) return res.status(404).json({ message: 'Student profile not found' })

    const placement = await Placement.findOne({ studentId: student._id })
    if (!placement) return res.status(404).json({ message: 'Save your company profile first' })
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' })

    if (placement.organogramImage) {
      const parts = placement.organogramImage.split('/')
      const publicId = parts.slice(-2).join('/').split('.')[0]
      await cloudinary.uploader.destroy(publicId).catch(() => {})
    }

    placement.organogramImage = req.file.path
    await placement.save()

    res.json({ message: 'Organogram uploaded', organogramImage: placement.organogramImage })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    IT Admin approves a student placement
// @route   PATCH /api/placement/:placementId/approve
// @access  it_admin
const approvePlacement = async (req, res) => {
  try {
    const placement = await Placement.findById(req.params.placementId)
    if (!placement) return res.status(404).json({ message: 'Placement not found' })

    if (placement.schoolId.toString() !== req.user.schoolId.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    placement.isApprovedByAdmin = true
    placement.approvedAt = new Date()
    await placement.save()

    res.json({ message: 'Placement approved', placement })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// @desc    Get all placements for a school (admin)
// @route   GET /api/placement/school-placements
// @access  it_admin
const getSchoolPlacements = async (req, res) => {
  try {
    const placements = await Placement.find({ schoolId: req.user.schoolId })
      .populate('studentId', 'matricNumber department faculty yearOfStudy')
      .sort({ createdAt: -1 })
    res.json({ count: placements.length, placements })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getMyPlacement,
  savePlacement,
  addIndustrySupervisor,
  removeIndustrySupervisor,
  uploadOrganogram,
  approvePlacement,
  getSchoolPlacements
}
