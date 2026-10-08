const Guest = require('../models/Guest');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

exports.listGuests = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  res.json(await Guest.find(q).sort({ seq: -1 }).lean());
});

exports.getGuest = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id).lean();
  if (!guest) throw new AppError('Guest not found.', 404);
  res.json(guest);
});

exports.updateGuest = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id);
  if (!guest) throw new AppError('Guest not found.', 404);
  const b = req.body || {};
  if (b.name !== undefined) { if (String(b.name).trim().length < 2) throw new AppError('Enter the guest name.', 400); guest.name = String(b.name).trim(); }
  if (b.mobile !== undefined) { if (!/^[6-9]\d{9}$/.test(String(b.mobile))) throw new AppError('Enter a valid 10-digit mobile number.', 400); guest.mobile = String(b.mobile); }
  if (b.email !== undefined) guest.email = String(b.email).trim();
  if (b.location !== undefined) guest.location = String(b.location).trim();
  await guest.save();
  res.json({ message: `${guest.name}'s details have been updated.`, guest });
});
