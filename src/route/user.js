const express= require("express");
const { createUser, getAllUser } = require("../controller/userController");


const router = express.Router();

router.route("/").post(createUser)
.get(getAllUser)


module.exports = router;