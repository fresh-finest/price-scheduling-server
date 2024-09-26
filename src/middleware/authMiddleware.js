const jwt = require("jsonwebtoken");
const User = require("../model/User");
const { errorHandler } = require("../utils/errorHandler");

exports.authenticateUser = async(req,res,next)=>{
    const token = req.cookies.access_token;

    if(!token){
        return res.status(401).json({message:"Unauthorized"});
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return next(errorHandler(401, 'Unauthorized'));
        }

        req.user = user;
        next();
    } catch (err) {
        return next(errorHandler(403, 'Forbidden'));
    }
 }

exports.authorizeAdmin = (req,res,next)=>{
    console.log(req.user.role);
    if(req.user.role!=='admin'){
        return res.status(403).json({message:"Forbidden: Admins Only"});
    }
    next();
}