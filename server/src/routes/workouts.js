const express = require('express');
const prisma = require('../lib/prisma');
const s = require('../validators/schemas');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { HttpError, asyncHandler } = require('../utils/http');
const { pageArgs, pageMeta, containsAny } = require('../utils/paginate');

const router = express.Router();
router.use(authenticate, requireRole('ADMIN'));

const detail = {
  exercises: { orderBy: { position: 'asc' }, include: { exercise: true } },
  assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
};

const toRows = (exercises) => exercises.map((e, i) => ({ ...e, position: i }));

async function assertExercisesExist(exercises) {
  const ids = [...new Set(exercises.map((e) => e.exerciseId))];
  const found = await prisma.exercise.count({ where: { id: { in: ids } } });
  if (found !== ids.length) throw new HttpError(400, 'One or more exercises do not exist');
}

router.get('/', validate(s.workoutList, 'query'), asyncHandler(async (req, res) => {
  const q = req.query;
  const where = {
    ...(q.difficulty ? { difficulty: q.difficulty } : {}),
    ...(q.search ? containsAny(['name', 'goal'], q.search) : {}),
  };
  const [total, data] = await prisma.$transaction([
    prisma.workoutPlan.count({ where }),
    prisma.workoutPlan.findMany({ where, orderBy: { name: 'asc' }, ...pageArgs(q), include: { _count: { select: { exercises: true, assignments: true } } } }),
  ]);
  res.json({ data, meta: pageMeta(q, total) });
}));

router.get('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  const plan = await prisma.workoutPlan.findUnique({ where: { id: req.params.id }, include: detail });
  if (!plan) throw new HttpError(404, 'Workout plan not found');
  res.json(plan);
}));

router.post('/', validate(s.workoutCreate), asyncHandler(async (req, res) => {
  const { exercises = [], ...data } = req.body;
  await assertExercisesExist(exercises);
  const plan = await prisma.workoutPlan.create({
    data: { ...data, exercises: { create: toRows(exercises) } },
    include: detail,
  });
  res.status(201).json(plan);
}));

router.put('/:id', validate(s.params, 'params'), validate(s.workoutUpdate), asyncHandler(async (req, res) => {
  const { exercises, ...data } = req.body;
  const id = req.params.id;
  if (exercises) await assertExercisesExist(exercises);
  await prisma.$transaction(async (tx) => {
    await tx.workoutPlan.update({ where: { id }, data });
    if (exercises) {
      await tx.workoutPlanExercise.deleteMany({ where: { workoutPlanId: id } });
      await tx.workoutPlanExercise.createMany({ data: toRows(exercises).map((e) => ({ ...e, workoutPlanId: id })) });
    }
  });
  res.json(await prisma.workoutPlan.findUnique({ where: { id }, include: detail }));
}));

router.delete('/:id', validate(s.params, 'params'), asyncHandler(async (req, res) => {
  await prisma.workoutPlan.delete({ where: { id: req.params.id } });
  res.status(204).end();
}));

router.post('/:id/assign', validate(s.params, 'params'), validate(s.assignWorkout), asyncHandler(async (req, res) => {
  const member = await prisma.user.findFirst({ where: { id: req.body.userId, role: 'MEMBER', isActive: true } });
  if (!member) throw new HttpError(404, 'Member not found or inactive');
  const plan = await prisma.workoutPlan.findUnique({ where: { id: req.params.id } });
  if (!plan) throw new HttpError(404, 'Workout plan not found');
  const assignment = await prisma.memberWorkout.upsert({
    where: { userId_workoutPlanId: { userId: member.id, workoutPlanId: plan.id } },
    create: { userId: member.id, workoutPlanId: plan.id },
    update: {},
  });
  res.status(201).json(assignment);
}));

router.delete('/:id/assign/:userId', validate(s.paramsWithUser, 'params'), asyncHandler(async (req, res) => {
  await prisma.memberWorkout.deleteMany({ where: { workoutPlanId: req.params.id, userId: req.params.userId } });
  res.status(204).end();
}));

module.exports = router;
