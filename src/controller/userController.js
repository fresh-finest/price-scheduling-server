const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { createUserService, getAllUserService, updateUserRoleService, deleteUserServiceById} = require('../service/userService');
const sendEmail = require('../service/EmailService');
const { errorHandler } = require("../utils/errorHandler");

const User = require("../model/User");

exports.createUser = async (req, res, next) => {
   
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const newUser = {
            ...req.body,
            password: hashedPassword
        };

        const result = await createUserService(newUser);
        console.log(req.body);
        res.status(201).json({
            status: "Success",
            message: "Successfully added new user!",
            result
        });
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error
            res.status(409).json({
                status: "Fail",
                message: "User with this username already exists.",
                error: error.message
            });
        } else {
            res.status(400).json({
                status: "Fail",
                message: "Couldn't create data.",
                error: error.message
            });
        }
    }
};


exports.getAllUser=async(req,res,next)=>{
    try {
        const result = await getAllUserService();

       
        const userWithoutPassword = result.map(user=>{
            const {password,...userWithoutPassword} = user._doc;
            return userWithoutPassword;
        })
        
       res.status(200).json({
        status:"Success",
        message:"Successfully fetched data.",
        result: userWithoutPassword
       })
    } catch (error) {
        res.status(404).json({
            status:"Fails",
            message:"Couldn't fetch data.",
            error:error.message
        })
    }
}

exports.updateUserRole = async(req,res,next)=>{
    try {
        const {userId}  = req.params;
        const {role,permissions} = req.body;
        const updateUser = await updateUserRoleService(userId,role,permissions);

        if(!updateUser){
            return res,status(404).json({
                status:"Fail",
                message:"User not found"
            })
        }
        res.status(200).json({
            status:"Success",
            message:"Successfully updated data.",
            result: updateUser
           })
    } catch (error) {
        res.status(404).json({
            status:"Fails",
            message:"Couldn't updated data.",
            error:error.message
        })
    }
}

exports.deleteUserById = async(req,res)=>{
    try {
        const {id}= req.params;
        await deleteUserServiceById(id)

        res.status(200).json({
            status:"success",
            message:"Successfully deleted user"
        })
    } catch (error) {
        res.status(404).json({
            status:"Fails",
            message:"Couldn't updated data",
            error:error.message
        })
    }
}

exports.inviteUser = async (req, res, next) => {
    const { email, role } = req.body;

    try {
        // Validate email and role
        if (!email || !email.trim()) {
            return res.status(400).json({
                status: "Fail",
                message: "Email is required and cannot be empty."
            });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email: email.trim() });
        if (existingUser) {
            return res.status(409).json({
                status: "Fail",
                message: "User with this email already exists."
            });
        }

        // Create a new user with email and role
        const newUser = new User({
            email: email.trim(), // Trim any spaces
            role,
            permissions: role === 'admin' ? { read: true, write: true } : { read: true, write: false }
        });

        // Generate a token for password setup
        const token = crypto.randomBytes(20).toString('hex');
        newUser.resetPasswordToken = token;
        newUser.resetPasswordExpires = Date.now() + 6 * 60 * 60 * 1000; // Token expires in 5 minutes

        // Save the user to the database
        await newUser.save();

        // Log the email for debugging purposes
        console.log(`Sending invitation to ${newUser.email}`);
        console.log(token);
        // Send an invitation email with the password setup link
        // const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
        // const resetUrl = `https://price-changing.netlify.app/reset-password?token=${token}&email=${encodeURIComponent(email.trim())}`;
        const resetUrl = `https://dps-fresh-finest.netlify.app/reset-password?token=${token}&email=${encodeURIComponent(email.trim())}`;
        // const resetUrl = `http://localhost:5173/reset-password?token=${token}&email=${encodeURIComponent(email.trim())}`;




        await sendEmail(
            newUser.email.trim(), // Ensure no leading/trailing spaces
            'Invitation to join Fresh Finest',
            `You are invited to join Fresh Finest. Please set up your password using the following link: ${resetUrl}`,
            `<p>You are invited to join <strong>Fresh Finest</strong>.</p>
            <p>Please set up your password using the link below:</p>
            <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #28a745; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>`
        );

        res.status(200).json({
            status: "Success",
            message: "Invitation sent successfully!",
            user: newUser
        });
    } catch (error) {
        console.error('Error inviting user:', error);
        next(errorHandler(500, "Couldn't send the invitation."));
    }
};