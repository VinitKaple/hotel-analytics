const router = require('express').Router();
const c = require('../controllers/settingsController');
router.get('/', c.getSettings);
router.put('/', c.updateSettings);
router.put('/room-types', c.updateRoomType);
module.exports = router;
