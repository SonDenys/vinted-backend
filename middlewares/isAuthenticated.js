// Import des models
const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    // Récupérer le token envoyé depuis le client
    const token = req.headers.authorization.replace("Bearer ", "");

    // Chercher le user qui possède ce token
    if (req.headers.authorization) {
      const user = await User.findOne({
        token: token,
      }).select("account email");
      //  Si on ne le trouve pas ==> (Unauthorized)
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
        // Sinon ==> next()
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
