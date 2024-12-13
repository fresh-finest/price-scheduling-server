const PriceSchedule = require("../model/PriceSchedule");
const User = require("../model/User");

exports.createUserService = async(data)=>{
    const user = await User.create(data);
    return user;
}

exports.getAllUserService = async()=>{
    const user = await User.find({});
    return user;
}

exports.getUserServiceById = async(id)=>{
  const user = await User.find({_id:id})
  return  user;
}
 exports.updateUserRoleService = async(userId,role,permissions)=>{
    const updateUser = await User.findByIdAndUpdate(
        userId,
        {role,permissions},
        {new: true}
    );
    return updateUser;
 }

 exports.updateUserServiceById = async(id,data)=>{
    const user = await User.updateOne(
        {_id:id},
        {
            $set:data,
        },
        {runValidators:true}
    )
    console.log(user);
    return user;
 }

 exports.deleteUserServiceById = async(id)=>{
    const deletedUser = await User.deleteOne({_id:id});
    return deletedUser;
 }

