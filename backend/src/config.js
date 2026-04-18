const path = require('path');

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'replace-me-in-production',
  dataFile: process.env.DATA_FILE || path.join(__dirname, 'data', 'db.json'),
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  emailjsServiceId: process.env.EMAILJS_SERVICE_ID || '',
  emailjsTemplateId: process.env.EMAILJS_TEMPLATE_ID || '',
  emailjsPublicKey: process.env.EMAILJS_PUBLIC_KEY || '',
  emailjsPrivateKey: process.env.EMAILJS_PRIVATE_KEY || '',
};
