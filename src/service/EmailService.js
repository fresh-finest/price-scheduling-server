const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'biprobarai7@gmail.com', // Your Gmail username
    pass: 'euxy kcmv cvgx cnan',      // Your Gmail App Password
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
