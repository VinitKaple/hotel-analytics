const Settings = require('../models/Settings');

// Returns the single settings document, creating it with defaults on first use.
const getSettingsDoc = () =>
  Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true, setDefaultsOnInsert: true });

module.exports = { getSettingsDoc };
