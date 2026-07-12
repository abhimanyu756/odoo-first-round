const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'assetflow-api', time: new Date().toISOString() });
});

// Feature module routers are mounted here as they are built (per phase).
router.use('/auth', require('./auth/auth.routes'));
router.use('/departments', require('./departments/departments.routes'));
router.use('/categories', require('./categories/categories.routes'));
router.use('/employees', require('./employees/employees.routes'));
router.use('/assets', require('./assets/assets.routes'));
router.use('/allocations', require('./allocations/allocations.routes'));
router.use('/transfers', require('./allocations/transfers.routes'));
router.use('/bookings', require('./bookings/bookings.routes'));
router.use('/maintenance', require('./maintenance/maintenance.routes'));
router.use('/audits', require('./audits/audits.routes'));
router.use('/notifications', require('./notifications/notifications.routes'));
router.use('/activity', require('./activity/activity.routes'));
router.use('/dashboard', require('./dashboard/dashboard.routes'));
router.use('/reports', require('./reports/reports.routes'));

// Dev-only: manually run the scheduler tick (overdue flagging, booking rollover).
if (process.env.NODE_ENV !== 'production') {
  const { tick } = require('../jobs/scheduler');
  router.post('/dev/run-scheduler', async (req, res, next) => {
    try {
      await tick();
      res.json({ ok: true, ranAt: new Date().toISOString() });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = router;
