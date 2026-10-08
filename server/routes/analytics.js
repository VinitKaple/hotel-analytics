const router = require('express').Router();
const c = require('../controllers/analyticsController');
router.get('/', c.getAnalytics);
router.get('/reports', c.getReports);
module.exports = router;
