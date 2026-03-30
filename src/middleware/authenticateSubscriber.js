import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Required subscriber authentication middleware.
 * Verifies a subscriber JWT and rejects if absent or invalid.
 * Sets req.subscriber = { subscriberId, blogId, tier }.
 */
export default function authenticateSubscriber(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== "subscriber") {
      return res.status(403).json({ error: "Invalid token type" });
    }

    req.subscriber = {
      subscriberId: decoded.subscriberId,
      blogId: decoded.blogId,
      tier: decoded.tier,
    };
    next();
  } catch {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
