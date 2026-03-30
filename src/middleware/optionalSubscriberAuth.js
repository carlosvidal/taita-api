import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Optional subscriber authentication middleware.
 * Extracts subscriber info from a subscriber JWT if present,
 * but does NOT reject the request if absent or invalid.
 * Sets req.subscriber = { subscriberId, blogId, tier } or null.
 */
export default function optionalSubscriberAuth(req, res, next) {
  req.subscriber = null;

  const authHeader = req.headers["authorization"];
  if (!authHeader) return next();

  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === "subscriber") {
      req.subscriber = {
        subscriberId: decoded.subscriberId,
        blogId: decoded.blogId,
        tier: decoded.tier,
      };
    }
  } catch {
    // Invalid token — continue as unauthenticated
  }

  next();
}
