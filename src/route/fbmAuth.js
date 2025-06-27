const express = require("express");
const { signin, logOut, resetPassword,storeToken, requestPasswordReset,setForgetPassowrd,createRefreshToken} = require("../controller/fbmAuthController");

const router = express.Router();

router.post("/refresh-token",createRefreshToken)
router.post('/:id/token',storeToken);
router.post("/signin",signin);
router.get("/logout",logOut);
router.post("/reset-password",resetPassword);
router.post("/request-password-reset",requestPasswordReset);
router.post("/set-request-password",setForgetPassowrd)



module.exports = router;