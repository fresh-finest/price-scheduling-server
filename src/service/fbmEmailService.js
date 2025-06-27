const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'office@brecx.com', 
    pass: 'mred dywd kbix wkuq',      
  },
});


const sendFBMEmail = (to, subject, text, html) => {
  const mailOptions = {
    from:{
      name:'FBM Warehouse',
      address:'office@brecx.com'
    } ,
    to: to,                        // Recipient email
    subject: subject,              // Subject line
    text: text,                    // Plain text body
    html: html,                    // HTML body
  };

  return transporter.sendMail(mailOptions);
};




module.exports = sendFBMEmail;
