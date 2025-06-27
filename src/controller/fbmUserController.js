const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const FBMUser = require('../model/fbmUser');

const { createFBMUserService, getAllFBMUserService, updateFBMUserRoleService, deleteFBMUserServiceById, updateFBMUserServiceById, getFBMUserServiceById} = require('../service/fbmUserService');
const { errorHandler } = require("../utils/errorHandler");
const sendFBMEmail = require('../service/fbmEmailService');




exports.createFBMUser = async (req, res, next) => {
   
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const newFBMUser = {
            ...req.body,
            password: hashedPassword
        };

        const result = await createFBMUserService(newFBMUser);
        console.log(req.body);
        res.status(201).json({
            status: "Success",
            message: "Successfully added new FBMUser!",
            result
        });
    } catch (error) {
        if (error.code === 11000) {
            // Duplicate key error
            res.status(409).json({
                status: "Fail",
                message: "FBMUser with this FBMUsername already exists.",
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

exports.getAllFBMUser=async(req,res,next)=>{

    try {
        const result = await getAllFBMUserService();
        const FBMUserWithoutPassword = result.map(FBMUser=>{
            const {password,...FBMUserWithoutPassword} = FBMUser._doc;
            return FBMUserWithoutPassword;
        })
        
       res.status(200).json({
        status:"Success",
        message:"Successfully fetched data.",
        result: FBMUserWithoutPassword
       })
    } catch (error) {
        res.status(404).json({
            status:"Fails",
            message:"Couldn't fetch data.",
            error:error.message
        })
    }
}
exports.getFBMUserById= async(req,res,next)=>{
    try {
        const {id} = req.params;

        const result = await getFBMUserServiceById(id);
        res.status(200).json({
            status:"Success",
            message:"Succcessfully get FBMUser",
            result
        })
    } catch (error) {
        res.status(500).json({
            status:"Failed",
            message:"Failed to fetch the FBMUser.",
            error:error.message
        })
    }
}
exports.updateFBMUserRole = async(req,res,next)=>{
    try {
        const {FBMUserId}  = req.params;
        const {role,permissions} = req.body;
        const updateFBMUser = await updateFBMUserRoleService(FBMUserId,role,permissions);

        if(!updateFBMUser){
            return res,status(404).json({
                status:"Fail",
                message:"FBMUser not found"
            })
        }
        res.status(200).json({
            status:"Success",
            message:"Successfully updated data.",
            result: updateFBMUser
           })
    } catch (error) {
        res.status(404).json({
            status:"Fails",
            message:"Couldn't updated data.",
            error:error.message
        })
    }
}

exports.updateFBMUserById= async(req,res)=>{
    try {
        const {id}= req.params;
        
        const result = await updateFBMUserServiceById(id,req.body);
        res.status(200).json({
            status:"Success",
            message:"Successfully updated data.",
            result
        })
    } catch (error) {
        res.status(400).json({
            status:"Failes",
            message:"Couldn't updated FBMUser",
            error:error.message
        })
    }
}
exports.deleteFBMUserById = async(req,res)=>{
    try {
        const {id}= req.params;
        await deleteFBMUserServiceById(id)

        res.status(200).json({
            status:"success",
            message:"Successfully deleted FBMUser"
        })
    } catch (error) {
        res.status(404).json({
            status:"Fails",
            message:"Couldn't updated data",
            error:error.message
        })
    }
}

exports.inviteFBMUser = async (req, res, next) => {
    const { email, role } = req.body;

    try {
        // Validate email and role
        if (!email || !email.trim()) {
            return res.status(400).json({
                status: "Fail",
                message: "Email is required and cannot be empty."
            });
        }

        // Check if the FBMUser already exists
        const existingFBMUser = await FBMUser.findOne({ email: email.trim() });
        if (existingFBMUser) {
            return res.status(409).json({
                status: "Fail",
                message: "FBMUser with this email already exists."
            });
        }

        // Create a new FBMUser with email and role
        const newFBMUser = new FBMUser({
            email: email.trim(), // Trim any spaces
            role,
            permissions: role === 'admin' ? { read: true, write: true } : { read: true, write: false }
        });

        // Generate a token for password setup
        const token = crypto.randomBytes(20).toString('hex');
        newFBMUser.resetPasswordToken = token;
        newFBMUser.resetPasswordExpires = Date.now() + 6 * 60 * 60 * 1000; // Token expires in 5 minutes

        // Save the FBMUser to the database
        await newFBMUser.save();

        // Log the email for debugging purposes
        console.log(`Sending invitation to ${newFBMUser.email}`);
        console.log(token);
        // Send an invitation email with the password setup link
        // const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
        // const resetUrl = `https://price-changing.netlify.app/reset-password?token=${token}&email=${encodeURIComponent(email.trim())}`;
        // const resetUrl = `https://app.priceobo.com/reset-password?token=${token}&email=${encodeURIComponent(email.trim())}`;
        const resetUrl = `http://https://fbm.priceobo.com/reset-password?token=${token}&email=${encodeURIComponent(email.trim())}`;




        await sendFBMEmail(
            newFBMUser.email.trim(), // Ensure no leading/trailing spaces
            'Invitation to join FBM Warehouse',
            `You are invited to join FBM Warehouse. Please set up your password using the following link: ${resetUrl}`,
            `<p>You are invited to join <strong>FBM Warehouse</strong>.</p>
            <p>Please set up your password using the link below:</p>
            <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #28a745; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>`
        );

        res.status(200).json({
            status: "Success",
            message: "Invitation sent successfully!",
            FBMUser: newFBMUser
        });
    } catch (error) {
        console.error('Error inviting FBMUser:', error);
        next(errorHandler(500, "Couldn't send the invitation."));
    }
};