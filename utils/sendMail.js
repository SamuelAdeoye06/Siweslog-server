const { Resend } = require('resend')

// Resend uses HTTPS (port 443) to deliver email — never blocked by cloud
// providers. Gmail SMTP (port 587) times out on Railway, Render, AWS etc.
// because those providers block outbound SMTP to prevent spam.
const resend = new Resend(process.env.RESEND_API_KEY)

// MAIL_FROM format: "SIWESlog <noreply@yourdomain.com>"
// Until your domain is verified on Resend, use "onboarding@resend.dev" for
// testing — it can send to any address. Once you verify a domain on the
// Resend dashboard, switch MAIL_FROM to your own domain address.
const FROM = process.env.MAIL_FROM || 'SIWESlog <onboarding@resend.dev>'

const sendMail = async ({ to, subject, html }) => {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) {
    console.error('Mail send error:', error)
    throw new Error('Failed to send email')
  }
}

// ── WELCOME EMAIL ──
const sendWelcomeEmail = async ({ to, firstName, role }) => {
  const roleLabels = {
    student: 'Student',
    school_supervisor: 'School Supervisor',
    it_admin: 'IT Admin'
  }
  const roleMessages = {
    student: 'You can now log in and start filling your SIWES logbook digitally.',
    school_supervisor: 'Your account is pending approval by your IT admin. You will receive another email once approved.',
    it_admin: 'Your school has been registered. You can now log in and manage your SIWES students.'
  }
  await sendMail({
    to,
    subject: 'Welcome to SIWESlog',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#F5F7FA;font-family:'DM Sans',Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
          <div style="background:#080F1F;padding:28px 32px;">
            <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              SIWES<span style="color:#4F8EF7;">log</span>
            </div>
          </div>
          <div style="padding:32px;">
            <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Welcome, ${firstName}!</h2>
            <p style="font-size:15px;color:#64748B;line-height:1.65;margin:0 0 20px;">
              Your <strong>${roleLabels[role] || role}</strong> account on SIWESlog has been created successfully.
            </p>
            <p style="font-size:15px;color:#64748B;line-height:1.65;margin:0 0 28px;">
              ${roleMessages[role] || 'You can now access your account.'}
            </p>
            <a href="${process.env.CLIENT_URL}/login"
               style="display:inline-block;background:#4F8EF7;color:#fff;padding:13px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              Sign In to SIWESlog
            </a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
            © ${new Date().getFullYear()} SIWESlog. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  })
}

// ── OTP EMAIL ──
const sendOTPEmail = async ({ to, firstName, otp, purpose }) => {
  const purposes = {
    password_change: 'change your password',
    password_reset: 'reset your password',
    account_deletion: 'delete your account'
  }
  await sendMail({
    to,
    subject: `SIWESlog — Your verification code`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#F5F7FA;font-family:'DM Sans',Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
          <div style="background:#080F1F;padding:28px 32px;">
            <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
              SIWES<span style="color:#4F8EF7;">log</span>
            </div>
          </div>
          <div style="padding:32px;">
            <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Verification Code</h2>
            <p style="font-size:15px;color:#64748B;line-height:1.65;margin:0 0 24px;">
              Hi ${firstName}, you requested to ${purposes[purpose] || 'verify your identity'}. Use the code below. It expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:#F8FAFC;border:2px dashed #E2E8F0;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <div style="font-size:40px;font-weight:800;color:#0F172A;letter-spacing:8px;">${otp}</div>
            </div>
            <p style="font-size:13px;color:#94A3B8;margin:0;">
              If you did not request this, you can safely ignore this email. Do not share this code with anyone.
            </p>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
            © ${new Date().getFullYear()} SIWESlog. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  })
}

// ── SUPERVISOR APPROVAL EMAIL ──
const sendSupervisorApprovalEmail = async ({ to, firstName }) => {
  await sendMail({
    to,
    subject: 'Your SIWESlog account has been approved',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#F5F7FA;font-family:'DM Sans',Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
          <div style="background:#080F1F;padding:28px 32px;">
            <div style="font-size:20px;font-weight:800;color:#fff;">SIWES<span style="color:#4F8EF7;">log</span></div>
          </div>
          <div style="padding:32px;">
            <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">Account Approved</h2>
            <p style="font-size:15px;color:#64748B;line-height:1.65;margin:0 0 20px;">
              Hi ${firstName}, your school supervisor account on SIWESlog has been approved by your IT admin. You can now sign in and start monitoring your assigned students.
            </p>
            <a href="${process.env.CLIENT_URL}/login"
               style="display:inline-block;background:#4F8EF7;color:#fff;padding:13px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              Sign In Now
            </a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
            © ${new Date().getFullYear()} SIWESlog. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  })
}

// ── SCHOOL APPROVAL EMAIL ──
const sendSchoolApprovalEmail = async ({ to, firstName, schoolName, registrationCode }) => {
  await sendMail({
    to,
    subject: 'Your school has been approved on SIWESlog',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#F5F7FA;font-family:'DM Sans',Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
          <div style="background:#080F1F;padding:28px 32px;">
            <div style="font-size:20px;font-weight:800;color:#fff;">SIWES<span style="color:#4F8EF7;">log</span></div>
          </div>
          <div style="padding:32px;">
            <h2 style="font-size:22px;font-weight:800;color:#0F172A;margin:0 0 8px;">School Approved</h2>
            <p style="font-size:15px;color:#64748B;line-height:1.65;margin:0 0 20px;">
              Hi ${firstName}, <strong>${schoolName}</strong> has been approved on SIWESlog. Your IT admin account is now active.
            </p>
            <div style="background:#F8FAFC;border:2px dashed #E2E8F0;border-radius:10px;padding:20px;text-align:center;margin-bottom:20px;">
              <p style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Your School Registration Code</p>
              <p style="font-size:24px;font-weight:800;color:#0F172A;letter-spacing:4px;margin:0;">${registrationCode}</p>
              <p style="font-size:12px;color:#94A3B8;margin:8px 0 0;">Share this code with your students and supervisors so they can register on SIWESlog.</p>
            </div>
            <a href="${process.env.CLIENT_URL}/login"
               style="display:inline-block;background:#4F8EF7;color:#fff;padding:13px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
              Sign In Now
            </a>
          </div>
          <div style="padding:20px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
            © ${new Date().getFullYear()} SIWESlog. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `
  })
}

// ── INDUSTRY SUPERVISOR ADDED EMAIL ──
const sendIndustrySupervisorAddedEmail = async ({ to, supervisorName, studentName, companyName }) => {
  await sendMail({
    to,
    subject: `You've been added as an Industry Supervisor on SIWESlog`,
    html: `
      <!DOCTYPE html><html><head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#F5F7FA;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;">
          <div style="background:#080F1F;padding:24px 32px;">
            <div style="font-size:20px;font-weight:800;color:#fff;">SIWES<span style="color:#4F8EF7;">log</span></div>
          </div>
          <div style="padding:32px;">
            <h2 style="font-size:20px;font-weight:800;color:#0F172A;margin:0 0 8px;">You've Been Registered as an Industry Supervisor</h2>
            <p style="font-size:15px;color:#64748B;line-height:1.65;margin:0 0 8px;">
              Hi ${supervisorName}, <strong>${studentName}</strong> has listed you as their industry-based supervisor at <strong>${companyName}</strong> on SIWESlog, a digital logbook platform for SIWES industrial training.
            </p>
            <p style="font-size:14px;color:#64748B;line-height:1.65;margin:0 0 24px;">
              No account or signup is needed on your part. Whenever ${studentName} submits a week of their logbook for your review, you'll receive an email with a secure link to view and approve it — no login required.
            </p>
            <p style="font-size:12px;color:#94A3B8;margin:0;">
              If you believe this was sent in error, you can safely ignore this email.
            </p>
          </div>
          <div style="padding:16px 32px;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center;">
            © ${new Date().getFullYear()} SIWESlog. All rights reserved.
          </div>
        </div>
      </body></html>
    `
  })
}

// ── LOG APPROVAL REQUEST EMAIL ──
const sendLogApprovalEmail = async ({ to, studentName, weekNumber, dateFrom, dateTo, approvalLink }) => {
  await sendMail({
    to,
    subject: `Week ${weekNumber} SIWES Log — Approval Needed`,
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
              <strong>${studentName}</strong> has submitted their <strong>Week ${weekNumber}</strong> SIWES logbook entry for your review and approval.
            </p>
            <p style="font-size:14px;color:#64748B;margin:0 0 24px;">
              Period: <strong>${new Date(dateFrom).toLocaleDateString('en-GB')} — ${new Date(dateTo).toLocaleDateString('en-GB')}</strong>
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
  })
}

module.exports = {
  sendWelcomeEmail,
  sendOTPEmail,
  sendSupervisorApprovalEmail,
  sendSchoolApprovalEmail,
  sendIndustrySupervisorAddedEmail,
  sendLogApprovalEmail
}
