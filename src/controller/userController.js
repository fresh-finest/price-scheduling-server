const bcrypt = require('bcryptjs');
const { createUserService } = require('../service/userService');



exports.createUser = async(req,res,next)=>{
    try {
        const hashedPassword = await bcrypt.hash(req.body.password,10);

        const newUser = {
            ...req.body,
            password: hashedPassword
        }
        const result = createUserService(newUser);

        res.status(201).json({
            status:"Success",
            message:"Successfully added new user!",
            result
        })
    } catch (error) {
        res.status(400).json({
            status:"Fails",
            message:"Couldn't create data.",
            error:error.message
        })
    }
}