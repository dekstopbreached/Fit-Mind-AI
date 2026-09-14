import { ApiError } from "./errorHandler.js";

export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) throw ApiError.forbidden("Admin access required", "ADMIN_ONLY");
  return next();
};

export default requireAdmin;