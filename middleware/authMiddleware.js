import jwt from 'jsonwebtoken';

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  console.log(`🔍 Received Token: ${token}`);

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "Unauthorized access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log("✅ Token Validated - User Role:", req.user.role);

    next();
  } catch (error) {
    console.log("❌ Invalid or expired token:", error.message);
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Role-based access control middleware
export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied - Insufficient permissions' });
    }
    next();
  };
};