function sanitizeValue(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/<script.*?>.*?<\/script>/gi, "") // Remove <script> tags
    .replace(/<\/?[^>]+(>|$)/g, "") // Remove other HTML tags
    .replace(/javascript:/gi, "") // Prevent javascript: URIs
    .replace(/on\w+=".*?"/gi, ""); // Remove inline JS handlers like onclick=""
}
function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  Object.keys(obj).forEach((key) => {
    const value = obj[key];
    if (typeof value === "string") {
      obj[key] = sanitizeValue(value);
    } else if (typeof value === "object") {
      sanitizeObject(value);
    }
  });
  return obj;
}

function xssSanitize(req, res, next) {
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  next();
};

module.exports = xssSanitize