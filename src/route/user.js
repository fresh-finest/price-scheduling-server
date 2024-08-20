const express= require("express");
const { createUser, getAllUser, updateUserRole } = require("../controller/userController");


const router = express.Router();


router.route("/:userId/role").patch(updateUserRole)
router.route("/").post(createUser)
.get(getAllUser)



module.exports = router;