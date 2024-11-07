const Account = require("../model/Account")


exports.createAccountService= async(data)=>{
    const account = await Account.create(data);
    return account;
}

exports.getAccountService = async()=>{
    const account = await Account.find({});
    return account;
}