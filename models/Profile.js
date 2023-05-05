const mongoose = require("mongoose");

const Profile = mongoose.model("Profile", {
  firstName: String,
  lastName: String,
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
  },
  avatar: mongoose.Schema.Types.Mixed,
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = Profile;
