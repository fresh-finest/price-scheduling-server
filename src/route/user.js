const express= require("express");
const { createUser, getAllUser, updateUserRole,deleteUserById,inviteUser, updateUserById} = require("../controller/userController");


const router = express.Router();


router.route("/invite").post(inviteUser)
router.route("/:userId/role").patch(updateUserRole)
router.route("/:id").put(updateUserById)
router.route("/:id").delete(deleteUserById)
router.route("/").post(createUser)
.get(getAllUser)



module.exports = router;