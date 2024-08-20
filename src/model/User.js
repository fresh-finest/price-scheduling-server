const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    userName: {
        type: String,
        unique: true,
        required: true,
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    designation:{
        type:String
    },
    role:{
        type:String,
        default:"user"
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
    read: { type: Boolean, default: false },
    write: { type: Boolean, default: false },
    update:{type:Boolean, default: false},
    delete: { type: Boolean, default: false },
    analysis:{type: Boolean, default: false}
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);
module.exports = User;