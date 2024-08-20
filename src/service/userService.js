const User = require("../model/User");

exports.createUserService = async(data)=>{
    const user = await User.create(data);
    return user;
}

exports.getAllUserService = async()=>{
    const user = await User.find({});
    return user;
}

 exports.updateUserRoleService = async(userId,role,permissions)=>{
    const updateUser = await User.findByIdAndUpdate(
        userId,
        {role,permissions},
        {new: true}
    );
    return updateUser;
 }