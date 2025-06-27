const FBMUser = require("../model/fbmUser");

exports.createFBMUserService = async (data) => {
  const FBMUser = await FBMUser.create(data);
  return FBMUser;
};

exports.getAllFBMUserService = async () => {
  const result = await FBMUser.find({});
  return result;
};

exports.getFBMUserServiceById = async (id) => {
  const FBMUser = await FBMUser.find({ _id: id });
  return FBMUser;
};
exports.updateFBMUserRoleService = async (FBMUserId, role, permissions) => {
  const updateFBMUser = await FBMUser.findByIdAndUpdate(
    FBMUserId,
    { role, permissions },
    { new: true }
  );
  return updateFBMUser;
};

//  exports.updateFBMUserServiceById = async(id,data)=>{
//     const FBMUser = await FBMUser.updateOne(
//         {_id:id},
//         {
//             $set:data,
//         },
//         {runValidators:true}
//     )
//     console.log(FBMUser);
//     return FBMUser;
//  }

exports.updateFBMUserServiceById = async (id, data) => {
    try {
        // Fetch the old FBMUser data
        const oldFBMUser = await FBMUser.findById(id);
        if (!oldFBMUser) {
            throw new Error('FBMUser not found');
        }


        // Update the FBMUser document
        const FBMUserUpdateResult = await FBMUser.updateOne(
            { _id: id },
            { $set: data },
            { runValidators: true }
        );

        console.log('FBMUser updated:', FBMUserUpdateResult);
        return FBMUserUpdateResult;
    } catch (error) {
        console.error('Error updating FBMUser:', error);
        throw error;
    }
};
exports.deleteFBMUserServiceById = async (id) => {
  const deletedFBMUser = await FBMUser.deleteOne({ _id: id });
  return deletedFBMUser;
};
