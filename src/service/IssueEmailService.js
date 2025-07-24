const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'office@brecx.com', 
    pass: 'mred dywd kbix wkuq',      
  },
});


const sendIssueAlertEmail = (to, subject, text, html) => {
  if (!to || (Array.isArray(to) && to.length === 0)) {
    throw new Error("No recipients defined");
  }

  const recipients = Array.isArray(to) ? to.join(", ") : to;

  const mailOptions = {
    from: {
      name: 'FBM Warehouse',
      address: 'office@brecx.com',
    },
    to: recipients,
    subject,
    text,
    html,
  };

  return transporter.sendMail(mailOptions);
};




module.exports = sendIssueAlertEmail;
