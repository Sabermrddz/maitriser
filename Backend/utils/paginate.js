export const getPagination = (query) => {
  let page = Math.min(10000, Math.max(1, parseInt(query.page) || 1));
  let limit = Math.min(200, Math.max(1, parseInt(query.limit) || 50));
  return { skip: (page - 1) * limit, limit, page };
};

export const paginatedResponse = (data, total, page, limit) => ({
  data,
  total,
  page,
  totalPages: Math.ceil(total / limit),
});
