const ApiError = require('../utils/ApiError');

// Runs a zod schema against a request part ('body' | 'query' | 'params') and
// replaces it with the parsed (coerced) value. Throws 400 with field details.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }
    // Express 5 makes req.query (and req.params) getter-only, so a plain
    // assignment is silently ignored — redefine the property so the coerced
    // value (booleans, dates, numbers) actually replaces the raw strings.
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

module.exports = { validate };
