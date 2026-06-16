const express = require('express')
const router = express.Router()
const {
  getMe,
  updateProfile,
  updatePhoto,
  requestPasswordChange,
  confirmPasswordChange,
  requestAccountDeletion,
  confirmAccountDeletion
} = require('../controllers/settings.controller')
const { protect } = require('../middleware/auth.middleware')
const { upload } = require('../config/cloudinary')

router.use(protect)

router.get('/me', getMe)
router.patch('/update-profile', updateProfile)
router.patch('/update-photo', upload.single('photo'), updatePhoto)
router.post('/request-password-change', requestPasswordChange)
router.patch('/confirm-password-change', confirmPasswordChange)
router.post('/request-account-deletion', requestAccountDeletion)
router.delete('/confirm-account-deletion', confirmAccountDeletion)

module.exports = router
