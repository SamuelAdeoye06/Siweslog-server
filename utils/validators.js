// Password must be at least 8 characters, contain at least:
// one uppercase, one lowercase, one number, one special character
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/

const validatePassword = (password) => {
  if (!passwordRegex.test(password)) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&^#)'
    }
  }
  return { valid: true }
}

// Basic email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validateEmail = (email) => {
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please provide a valid email address' }
  }
  return { valid: true }
}

// Nigerian phone number regex — 11 digits starting with 0, or +234
const phoneRegex = /^(\+234|0)[789][01]\d{8}$/

const validatePhone = (phone) => {
  if (phone && !phoneRegex.test(phone)) {
    return { valid: false, message: 'Please provide a valid Nigerian phone number' }
  }
  return { valid: true }
}

module.exports = { validatePassword, validateEmail, validatePhone }