const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// ── PROFILE PHOTOS ── square crop makes sense for avatars
const profilePhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'siweslog/profile_photos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }]
  }
})

// ── ORGANOGRAMS ── these are charts/diagrams; cropping to a square would
// cut off content. Just cap the max dimension so huge phone photos don't
// bloat storage, without forcing an aspect ratio.
const organogramStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'siweslog/organograms',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }]
  }
})

// ── LOG ATTACHMENTS ── sketches, diagrams, scanned pages, and PDFs.
// Same "limit" approach — preserve full content, just cap max size.
// raw_convert isn't needed; resource_type 'auto' lets Cloudinary handle
// both images and PDFs correctly.
const attachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'siweslog/log_attachments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    resource_type: 'auto',
    transformation: [{ width: 1600, height: 1600, crop: 'limit' }]
  }
})

const upload = multer({ storage: profilePhotoStorage })
const uploadOrganogram = multer({ storage: organogramStorage })
const uploadAttachment = multer({ storage: attachmentStorage })

module.exports = { cloudinary, upload, uploadOrganogram, uploadAttachment }
