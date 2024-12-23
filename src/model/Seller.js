
const mongoose = require('mongoose');


const sellerSchema = new mongoose.Schema({
    name:{type:String , required:true},
    email:{type:String, required:true, unique:true},
    phone:{type:String, required:true},
    status:{type:String, required: true, enum:['active','inactive'], default:'active'},
    subscriptionsIds:[{type:mongoose.Schema.Types.ObjectId, ref:'Subscription'}]
})

const Seller = mongoose.model('Seller',sellerSchema);
module.exports = Seller;