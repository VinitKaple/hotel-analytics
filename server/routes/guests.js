const router = require('express').Router();
const c = require('../controllers/guestController');
router.get('/', c.listGuests);
router.get('/:id', c.getGuest);
router.patch('/:id', c.updateGuest);
router.put('/:id', c.updateGuest);
module.exports = router;
