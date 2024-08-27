const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { errorHandler } = require("../utils/errorHandler");
const bcrypt = require('bcryptjs');

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

exports.resetPassword = async(req,res,next)=>{
    console.log(req.body);
   
    const {token,newPassword,confirmNewPassword} = req.body;
    console.log('Token received on the backend:', token);

    if (newPassword !== confirmNewPassword) {
        return next(errorHandler(400, "Passwords do not match"));
    }
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        })

        if(!user){
            return next(errorHandler(400, "Invalid or expired token"));
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        res.status(200).json({ message: 'Password has been reset successfully' });

    } catch (error) {
        next(error);
    }

}


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