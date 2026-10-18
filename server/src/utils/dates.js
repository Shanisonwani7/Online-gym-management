const DAY_MS = 24 * 60 * 60 * 1000;

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

module.exports = { addDays, DAY_MS };
