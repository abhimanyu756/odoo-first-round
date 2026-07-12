const { Router } = require('express');

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'assetflow-api', time: new Date().toISOString() });
});

// Feature module routers are mounted here as they are built (per phase).
router.use('/auth', require('./auth/auth.routes'));

module.exports = router;
