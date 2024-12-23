const express = require("express");
const { createNotification, getNotifications, getUnreadNotifications, getmarkedNotificationAsRead, deleteNotification } = require("../controller/ownernotificationController");


const router = express.Router();

router.route("/").post(createNotification);
router.route("/").get(getNotifications);
router.route("/unread").get(getUnreadNotifications);
router.route("/:id/marked").put(getmarkedNotificationAsRead);
router.route("/:id").delete(deleteNotification);


module.exports = router;