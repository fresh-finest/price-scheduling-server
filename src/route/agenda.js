const express= require("express");
const { createNewSchedule,updateOldSchedule,deleteSchedule } = require("../controller/agendaScheduleController");

const router = express.Router();

// post /api/schedule/change

router.route("/change").post(createNewSchedule)
router.route("/change/:id").put(updateOldSchedule)
router.route("/change/:id").delete(deleteSchedule)




module.exports = router;