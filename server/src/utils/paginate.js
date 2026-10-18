const pageArgs = (q) => ({ skip: (q.page - 1) * q.pageSize, take: q.pageSize });

const pageMeta = (q, total) => ({
  page: q.page,
  pageSize: q.pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
});

const containsAny = (fields, text) => ({
  OR: fields.map((f) => ({ [f]: { contains: text, mode: 'insensitive' } })),
});

module.exports = { pageArgs, pageMeta, containsAny };
