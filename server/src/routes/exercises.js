const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta, containsAny } = require('../utils/paginate');

const router = express.Router();
router.use(authenticate);

router.get('/', validate(s.exerciseList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const where = {
    ...(q.difficulty ? { difficulty: q.difficulty } : {}),
    ...(q.search ? containsAny(['name', 'muscleGroup', 'equipment'], q.search) : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.exercise.count({ where }),
    prisma.exercise.findMany({ where, orderBy: { name: 'asc' }, ...pageArgs(q) }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.use(requireRole('ADMIN'));

router.post('/', validate(s.exerciseCreate), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.exercise.create({ data: req.body }));
}));

router.put('/:id', validate(s.params, 'params'), validate(s.exerciseUpdate), asyncHandler(async (req, res) => {
  res.json(await prisma.exercise.update({ where: { id: req.params.id }, data: req.body }));
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  const used = await prisma.workoutPlanExercise.count({ where: { exerciseId: req.params.id } });
  if (used > 0) throw new HttpError(409, 'This exercise is used in workout plans. Remove it from them first.');
  await prisma.exercise.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

module.exports = router;
