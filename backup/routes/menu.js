const express = require("express");
const menuController = require("../controllers/menuController");

const router = express.Router();

router.post("/menu", menuController.createMenuItem);

module.exports = router;
