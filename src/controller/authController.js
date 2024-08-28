const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { errorHandler } = require("../utils/errorHandler");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../service/EmailService');


exports.signin = async(req,res,next)=>{
    const {email,password} = req.body;

    try {
        const validUser = await User.findOne({ email: email });
        if (!validUser) return next(errorHandler(404, "User not found"));

        const validPassword = await bcrypt.compare(password, validUser.password);
        if (!validPassword) return next(errorHandler(401, "Wrong Password."));

        if (!process.env.JWT_SECRET) {
            return next(errorHandler(500, "JWT_SECRET environment variable not set"));
        }

        const token = jwt.sign({ id: validUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const { password: pass, ...rest } = validUser._doc;

        res
            .cookie("access_token", token, { httpOnly: true})
            .status(200)
            .json(rest);
    } catch (error) {
        next(error);
    }
}

exports.logOut = async(req,res,next)=>{
    try {
        res.clearCookie('access_token');
        res.status(200).json('User has been logged out1.')
    } catch (error) {
        next(error);
    }
}

exports.resetPassword = async (req, res, next) => {
    console.log('Request body:', req.body);
   
    const { token, userName, newPassword, confirmNewPassword } = req.body;
    console.log('Token received on the backend:', token);
    console.log('Username received on the backend:', userName);

    if (newPassword !== confirmNewPassword) {
        return next(errorHandler(400, "Passwords do not match"));
    }

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return next(errorHandler(400, "Invalid or expired token"));
        }

        console.log('User before update:', user);

        // Update the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Update the username
        console.log("username"+userName);
        if (userName) {
            user.userName = userName;  // Only update if userName is provided
            console.log('Setting userName to:', userName);
        } else {
            console.log('userName is not provided or is empty');
        }

        // Clear the reset token and expiration fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        // Save the updated user information
        await user.save();

        console.log('User successfully updated:', user);

        res.status(200).json({ message: 'Password and username have been set successfully' });

    } catch (error) {
        console.error('Error saving user:', error);
        next(error);
    }
};



exports.storeToken = async(req,res,next)=>{
    const {token,expiration} = req.body;
    const {id} = req.params;

    try {
        const user = await User.findById(id);
        if(!user){
            return next(errorHandler(404,"User not found"));
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = expiration;

        await user.save();

        res.status(200).json({ message: 'Token stored successfully' });
    } catch (error) {
        next(error);
    }
}

exports.requestPasswordReset = async (req,res,next)=>{
    const {email}= req.body;
    try {
        const user = await User.findOne({email});

        if(!user){
            return res.status(404).json({ message: 'User with this email does not exist.' });
        }

      const token = crypto.randomBytes(20).toString('hex');
      



      console.log(token);
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 5 * 60 *1000;

      await user.save();

      const resetUrl = `http://localhost:5173/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

      await sendEmail(
        user.email,
        'Password Reset Request',
         `You are invited to join Fresh Finest. Please set up your password using the following link: ${resetUrl}`,
         `
         <p>You are receiving this email because you (or someone else) have requested to reset the password for your account.</p>
         <p>Please click on the following button to complete the process:</p>
         <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #28a745; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
         <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`
    
    );

    res.status(200).json({ message: 'Password reset link sent to your email.' });


    } catch (error) {
        
    }
}



exports.setForgetPassowrd = async (req,res,next)=>{

    
    const { token, newPassword, confirmNewPassword } = req.body;
    if (newPassword !== confirmNewPassword) {
        return next(errorHandler(400, 'Passwords do not match'));
    }
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return next(errorHandler(400, 'Invalid or expired token'));
        }
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear the reset token and expiration fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully' });
        
    } catch (error) {
        console.error('Error resetting password:', error);
        next(error);
    }
}