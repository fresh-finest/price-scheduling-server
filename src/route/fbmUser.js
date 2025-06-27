const express= require("express");
const { createFBMUser, getAllFBMUser, updateFBMUserRole,deleteFBMUserById,inviteFBMUser, updateFBMUserById, getFBMUserById} = require("../controller/fbmUserController");


const router = express.Router();


router.route("/:id").get(getFBMUserById)
router.route("/invite").post(inviteFBMUser)
router.route("/:FBMUserId/role").patch(updateFBMUserRole)
router.route("/:id").put(updateFBMUserById)
router.route("/:id").delete(deleteFBMUserById)
router.route("/").post(createFBMUser)
router.route("/").get(getAllFBMUser)



module.exports = router;