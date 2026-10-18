const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', require('./auth'));
router.use('/plans', require('./plans'));
router.use('/dashboard', require('./dashboard'));
router.use('/members', require('./members'));
router.use('/trainers', require('./trainers'));
router.use('/memberships', require('./memberships'));
router.use('/payments', require('./payments'));
router.use('/attendance', require('./attendance'));
router.use('/exercises', require('./exercises'));
router.use('/workouts', require('./workouts'));
router.use('/me', require('./me'));

module.exports = router;
