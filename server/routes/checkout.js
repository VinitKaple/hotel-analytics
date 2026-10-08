const router = require('express').Router();
router.post('/', require('../controllers/checkController').checkOut);
module.exports = router;
