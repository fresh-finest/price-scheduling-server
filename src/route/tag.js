
const express = require('express');
const { createTag, getTag, updateTag, deleteTag } = require('../controller/tagController');

const router = express.Router();

router.route("/").post(createTag).get(getTag);
router.route("/:id").put(updateTag).delete(deleteTag);
module.exports = router;