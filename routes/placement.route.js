const express = require('express')
const router = express.Router()
const {
  getMyPlacement,
  savePlacement,
  addIndustrySupervisor,
  removeIndustrySupervisor,
  uploadOrganogram: uploadOrganogramController,
  approvePlacement,
  getSchoolPlacements
} = require('../controllers/placement.controller')
const { protect, authorizeRoles } = require('../middleware/auth.middleware')
const { uploadOrganogram: uploadOrganogramMiddleware } = require('../config/cloudinary')

router.use(protect)

router.get('/my-placement', authorizeRoles('student'), getMyPlacement)
router.post('/save', authorizeRoles('student'), savePlacement)
router.post('/supervisors', authorizeRoles('student'), addIndustrySupervisor)
router.delete('/supervisors/:supervisorId', authorizeRoles('student'), removeIndustrySupervisor)
router.patch('/organogram', authorizeRoles('student'), uploadOrganogramMiddleware.single('organogram'), uploadOrganogramController)
router.get('/school-placements', authorizeRoles('it_admin'), getSchoolPlacements)
router.patch('/:placementId/approve', authorizeRoles('it_admin'), approvePlacement)

module.exports = router
