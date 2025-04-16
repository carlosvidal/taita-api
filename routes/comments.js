const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');

router.post('/', commentsController.createComment);
router.get('/', commentsController.listComments);
router.patch('/:uuid/approve', commentsController.approveComment);
router.patch('/:uuid/reject', commentsController.rejectComment);
router.post('/request-otp', commentsController.requestOtp);
router.post('/verify-otp', commentsController.verifyOtp);

module.exports = router;
