const PriceSchedule = require("../model/PriceSchedule");
const User = require("../model/User");
const HistorySchedule = require("../model/HistorySchedule");
const Rule = require("../model/Rule");

exports.createUserService = async (data) => {
  const user = await User.create(data);
  return user;
};

exports.getAllUserService = async () => {
  const user = await User.find({});
  return user;
};

exports.getUserServiceById = async (id) => {
  const user = await User.find({ _id: id });
  return user;
};
exports.updateUserRoleService = async (userId, role, permissions) => {
  const updateUser = await User.findByIdAndUpdate(
    userId,
    { role, permissions },
    { new: true }
  );
  return updateUser;
};

//  exports.updateUserServiceById = async(id,data)=>{
//     const user = await User.updateOne(
//         {_id:id},
//         {
//             $set:data,
//         },
//         {runValidators:true}
//     )
//     console.log(user);
//     return user;
//  }

exports.updateUserServiceById = async (id, data) => {
    try {
        // Fetch the old user data
        const oldUser = await User.findById(id);
        if (!oldUser) {
            throw new Error('User not found');
        }

        // Check if userName is being updated
        if (data.userName && data.userName !== oldUser.userName) {
            const oldUserName = oldUser.userName;
            const newUserName = data.userName;

            // Update related collections
            const historyUpdateResult = await HistorySchedule.updateMany(
                { userName: oldUserName },
                { $set: { userName: newUserName } }
            );

            const priceScheduleUpdateResult = await PriceSchedule.updateMany(
                { userName: oldUserName },
                { $set: { userName: newUserName } }
            );
            const ruleUpdateResult = await Rule.updateMany(
              { userName: oldUserName },
              { $set: { userName: newUserName } }
          );

            console.log(
                `Updated username in related collections: History (${historyUpdateResult.modifiedCount} documents), Automation rule (${priceScheduleUpdateResult.modifiedCount} documents,PriceSchedule (${ruleUpdateResult.modifiedCount} documents).`
            );
        }

        // Update the User document
        const userUpdateResult = await User.updateOne(
            { _id: id },
            { $set: data },
            { runValidators: true }
        );

        console.log('User updated:', userUpdateResult);
        return userUpdateResult;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};
exports.deleteUserServiceById = async (id) => {
  const deletedUser = await User.deleteOne({ _id: id });
  return deletedUser;
};
