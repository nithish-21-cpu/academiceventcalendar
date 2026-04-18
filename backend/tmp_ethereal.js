const nodemailer = require('nodemailer');
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return process.exit(1);
    }
    console.log(JSON.stringify(account));
});
