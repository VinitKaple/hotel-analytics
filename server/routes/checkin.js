const router = require('express').Router();
router.post('/', require('../controllers/checkController').checkIn);
module.exports = router;
