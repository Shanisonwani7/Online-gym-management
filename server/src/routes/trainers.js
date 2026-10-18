const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta, containsAny } = require('../utils/paginate');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/', validate(s.trainerList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const where = {
    ...(q.active !== undefined ? { isActive: q.active } : {}),
    ...(q.search ? containsAny(['name', 'email', 'specialization'], q.search) : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.trainer.count({ where }),
    prisma.trainer.findMany({ where, orderBy: { name: 'asc' }, ...pageArgs(q), include: { _count: { select: { assignments: true } } } }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.post('/', validate(s.trainerCreate), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.trainer.create({ data: req.body }));
}));

router.put('/:id', validate(s.params, 'params'), validate(s.trainerUpdate), asyncHandler(async (req, res) => {
  res.json(await prisma.trainer.update({ where: { id: req.params.id }, data: req.body }));
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  await prisma.trainer.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
