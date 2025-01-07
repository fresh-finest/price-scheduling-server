const Account = require("../model/Account");
const { getAccountService, createAccountService } = require("../service/accountService");


exports.createAccount = async(req,res,next)=>{
    try {
        const result = await createAccountService(req.body);

        res.status(201).json({
            status:"Success",
            message:"Successfully created account.",
            result
        })
    } catch (error) {
        res.status(400).json({
            status:"Fails",
            message:"Couldn't add products",
            error:error.message
        })
    }
}

exports.saveUserTokens = async ({ accessToken, refreshToken, profile }) => {
    try {
      
      const MARKETPLACE_ID = profile?.marketplaceId || 'ATVPDKIKX0DER';
  
   
      let account = await Account.findOne({ profile });
  
      if (account) {
       
        account.accessToken = accessToken;
        account.refreshToken = refreshToken;
        account.MARKETPLACE_ID = MARKETPLACE_ID;
        await account.save();
      } else {
        
        account = new Account({
          accessToken,
          refreshToken,
          profile,
          MARKETPLACE_ID,
        });
        await account.save();
      }
  
      return account;
    } catch (error) {
      console.error('Error saving user tokens:', error);
      throw new Error('Failed to save user tokens');
    }
  };
  
 
exports.getAccount = async(req,res,next)=>{
    try {
        const result = await getAccountService();
        res.status(200).json({
            status:"success",
            message:"Get account",
            result
        })
    } catch (error) {
        
        res.status(400).json({
            status:"Fails",
            message:"Couldn't fetch data",
            error:error.message
        })
    }
}

