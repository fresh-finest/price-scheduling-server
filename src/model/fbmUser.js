const mongoose = require('mongoose');

const fbmUserSchema = mongoose.Schema({
    email:{
        type:String,
        unique:true,
        required:true
    },
    userName: {
        type: String,
        required:false
    },
    password:{
        type:String,
    },
    designation:{
        type:String
    },
    role: {
        type: String,
        enum: ['admin', 'picker', 'packer'],
        default: 'user'
    },
    avatar: {
        type: String,
        default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    permissions:{
    read: { type: Boolean, default: true },
    write: { type: Boolean, default: false },
    }
}, { timestamps: true });

const FBMUser = mongoose.model("FBMUser", fbmUserSchema);
module.exports = FBMUser;