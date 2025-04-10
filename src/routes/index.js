const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth"));
router.use("/categories", require("./categories"));
router.use("/media", require("./media"));
router.use("/menu", require("./menu"));
router.use("/pages", require("./pages"));
router.use("/posts", require("./posts"));
router.use("/stats", require("./stats"));
router.use("/settings", require("./settings"));

module.exports = router;
