const { Router } = require('express');
const ctrl = require('./bookings.controller');
const { authenticate } = require('../../middlewares/auth');
const { validate } = require('../../middlewares/validate');
const { createBookingSchema, rescheduleSchema, listBookingsQuery } = require('./bookings.schema');

const router = Router();

// Any authenticated user can view + book shared resources.
router.get('/', authenticate, validate(listBookingsQuery, 'query'), ctrl.list);
router.post('/', authenticate, validate(createBookingSchema), ctrl.create);
router.patch('/:id/reschedule', authenticate, validate(rescheduleSchema), ctrl.reschedule);
router.post('/:id/cancel', authenticate, ctrl.cancel);

module.exports = router;
