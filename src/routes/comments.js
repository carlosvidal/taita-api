import express from 'express';
import * as commentsController from '../controllers/commentsController.js';

const router = express.Router();

router.post('/', commentsController.createComment);
router.get('/', commentsController.listComments);
router.patch('/:uuid/approve', commentsController.approveComment);
router.patch('/:uuid/reject', commentsController.rejectComment);
router.patch('/:uuid/spam', commentsController.markSpamComment);
router.post('/request-otp', commentsController.requestOtp);
router.post('/verify-otp', commentsController.verifyOtp);

export default router;
