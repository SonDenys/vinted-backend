// Import models
const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    // Get back the token sent from the customer
    const token = req.headers.authorization.replace("Bearer ", "");

    // Look for the user who have the token
    if (req.headers.authorization) {
      const user = await User.findOne({
        token: token,
      }).select("account email");

      // If we don't find it ==> (Unauthorized)
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
        // If not  ==> next()
      } else {
        req.user = user;
        next();
      }
    } else {
      return rest.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
module.exports = isAuthenticated;
