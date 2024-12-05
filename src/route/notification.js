const express = require("express");
const {
  createNotification,
  getNotification,
  updateNotificationStatus,
  deleteNotificatoion,
} = require("../controller/notificationController");

const router = express.Router();

router.route("/").post(createNotification).get(getNotification);
router.route("/:id").put(updateNotificationStatus);
router.route("/:id").delete(deleteNotificatoion);

module.exports = router;
