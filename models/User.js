const mongoose = require("mongoose");

const User = mongoose.model("User", {
  email: {
    unique: true,
    type: String,
  },
  account: {
    username: {
      required: true,
      unique: true,
      type: String,
    },
    phone: {
      unique: true,
      type: String,
    },
  },
  profile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
    unique: true,
  },
  token: String,
  hash: String,
  salt: String,
});

module.exports = User;
