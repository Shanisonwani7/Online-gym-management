const { z } = require('zod');

// Empty string becomes null, undefined stays undefined (so partial updates work).
const optText = (max = 255) =>
  z.string().trim().max(max).nullish()
    .transform((v) => (v === undefined ? undefined : v === '' ? null : v));
const optDate = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.date().optional());
const posInt = z.number().int().positive();
const idParam = z.coerce.number().int().positive();
const boolStr = z.enum(['true', 'false']).transform((v) => v === 'true');

const DIFFICULTY = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const METHODS = ['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'];
const MEMBERSHIP_STATUS = ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'];

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(100);
const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

const paging = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
};
const search = z.string().trim().max(100).optional();

const profile = z.object({
  age: z.number().int().min(10).max(100).nullish(),
  gender: optText(30),
  heightCm: z.number().min(50).max(260).nullish(),
  weightKg: z.number().min(20).max(400).nullish(),
  bodyFatPercent: z.number().min(1).max(70).nullish(),
  goal: optText(200),
  medicalNotes: optText(1000),
  emergencyContact: optText(100),
});

const trainer = z.object({
  name,
  email,
  phone: optText(30),
  specialization: z.string().trim().min(2).max(100),
  experienceYears: z.number().int().min(0).max(60).default(0),
  bio: optText(1000),
  isActive: z.boolean().default(true),
});

const plan = z.object({
  name: z.string().trim().min(2).max(100),
  description: optText(500),
  durationDays: z.number().int().min(1).max(3650),
  price: z.number().min(0).max(1000000),
  isActive: z.boolean().default(true),
});

const workoutExercise = z.object({
  exerciseId: posInt,
  dayLabel: z.string().trim().min(1).max(30).default('Day 1'),
  sets: z.number().int().min(1).max(20).default(3),
  reps: z.number().int().min(1).max(200).default(10),
  restSeconds: z.number().int().min(0).max(600).default(60),
});

const workout = z.object({
  name: z.string().trim().min(2).max(100),
  description: optText(1000),
  goal: optText(200),
  difficulty: z.enum(DIFFICULTY).default('BEGINNER'),
  exercises: z.array(workoutExercise).max(100).optional(),
});

const exercise = z.object({
  name: z.string().trim().min(2).max(100),
  muscleGroup: z.string().trim().min(2).max(50),
  equipment: optText(100),
  description: optText(1000),
  difficulty: z.enum(DIFFICULTY).default('BEGINNER'),
});

const memberCreate = z.object({ name, email, password, phone: optText(30) });

module.exports = {
  params: z.object({ id: idParam }),
  paramsWithUser: z.object({ id: idParam, userId: idParam }),

  register: memberCreate,
  login: z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address'), password: z.string().min(1, 'Password is required') }),
  changePassword: z.object({ currentPassword: z.string().min(1), newPassword: password }),

  memberList: z.object({ ...paging, search, active: boolStr.optional() }),
  memberCreate,
  memberUpdate: z.object({
    name: name.optional(),
    email: email.optional(),
    phone: optText(30),
    isActive: z.boolean().optional(),
    password: password.optional(),
  }),
  profile,
  selfProfile: profile.extend({ name: name.optional(), phone: optText(30) }),
  trainerAssign: z.object({ trainerId: posInt.nullable() }),

  trainerList: z.object({ ...paging, search, active: boolStr.optional() }),
  trainerCreate: trainer,
  trainerUpdate: trainer.partial(),

  planList: z.object({ ...paging, search, active: boolStr.optional() }),
  planCreate: plan,
  planUpdate: plan.partial(),

  membershipList: z.object({
    ...paging,
    status: z.enum(MEMBERSHIP_STATUS).optional(),
    userId: idParam.optional(),
    planId: idParam.optional(),
  }),
  membershipCreate: z.object({
    userId: posInt,
    planId: posInt,
    startDate: optDate,
    status: z.enum(['ACTIVE', 'PENDING']).default('ACTIVE'),
  }),
  membershipStatus: z.object({ status: z.enum(['ACTIVE', 'CANCELLED']) }),
  subscribe: z.object({ planId: posInt }),

  paymentList: z.object({
    ...paging,
    search,
    userId: idParam.optional(),
    method: z.enum(METHODS).optional(),
    from: optDate,
    to: optDate,
  }),
  paymentCreate: z.object({
    userId: posInt,
    membershipId: posInt.nullish(),
    amount: z.number().positive('Amount must be greater than 0').max(10000000),
    method: z.enum(METHODS).default('CASH'),
    reference: optText(100),
    note: optText(500),
    paidAt: optDate,
  }),

  attendanceList: z.object({
    ...paging,
    userId: idParam.optional(),
    open: boolStr.optional(),
    from: optDate,
    to: optDate,
  }),
  attendanceCheckIn: z.object({ userId: posInt }),
  pageOnly: z.object({ ...paging }),

  exerciseList: z.object({ ...paging, search, difficulty: z.enum(DIFFICULTY).optional() }),
  exerciseCreate: exercise,
  exerciseUpdate: exercise.partial(),

  workoutList: z.object({ ...paging, search, difficulty: z.enum(DIFFICULTY).optional() }),
  workoutCreate: workout,
  workoutUpdate: workout.partial(),
  assignWorkout: z.object({ userId: posInt }),
};
