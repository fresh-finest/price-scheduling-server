const bcrypt = require('bcryptjs');
const { createUserService, getAllUserService, updateUserRoleService, deleteUserServiceById} = require('../service/userService');


exports.createUser = async (req, res, next) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const newUser = {
            ...req.body,
            password: hashedPassword
        };

        const result = await createUserService(newUser);

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