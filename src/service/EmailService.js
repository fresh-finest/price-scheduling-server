const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'office@brecx.com', // Your Gmail username
    pass: 'mred dywd kbix wkuq',      // Your Gmail App Password
  },
});


const sendEmail = (to, subject, text, html) => {
  const mailOptions = {
    from:{
      name:'Fresh Finest',
      address:'biprobarai7@gmail.com'
    } ,
    to: to,                        // Recipient email
    subject: subject,              // Subject line
    text: text,                    // Plain text body
    html: html,                    // HTML body
  };

  return transporter.sendMail(mailOptions);
};




module.exports = sendEmail;
