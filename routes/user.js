const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middlewares/isAuthenticated");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

const User = require("../models/User");
const Profile = require("../models/Profile");

// Import Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

router.post("/user/signup", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.fields.email });
    if (!user) {
      const salt = uid2(16);
      const hash = SHA256(req.fields.password + salt).toString(encBase64);
      const token = uid2(64);
      const newUser = new User({
        email: req.fields.email,
        account: {
          username: req.fields.username,
          phone: req.fields.phone,
        },
        token: token,
        hash: hash,
        salt: salt,
      });

      await newUser.save();
      res.status(200).json({
        email: newUser.email,
        account: newUser.account,
        token: newUser.token,
      });
    } else {
      res.status(409).json({ message: "This email already has an account." });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.fields.email });
    if (user) {
      const newHash = SHA256(req.fields.password + user.salt).toString(
        encBase64
      );

      if (newHash === user.hash) {
        res.status(200).json({
          email: user.email,
          account: user.account,
          token: user.token,
        });
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/user/profile", isAuthenticated, async (req, res) => {
  try {
    const profile = await Profile.findOne({ owner: req.user._id });
    if (profile) {
      res.status(200).json({
        firstName: profile.firstName,
        lastName: profile.lastName,
        address: {
          street: profile.address.street,
          city: profile.address.city,
          state: profile.address.state,
          zip: profile.address.zip,
        },
        avatar: profile.avatar,
        owner: req.user,
      });
    } else {
      res.status(404).json({ message: "Profile not found!" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Définissez une fonction de création de profil
async function createProfile(req) {
  const { firstName, lastName, street, city, state, zip } = req.fields;
  const fileKeys = Object.keys(req.files);
  if (fileKeys.length === 0) {
    throw new Error("No avatar uploaded!");
  }

  let avatarToUpload = req.files.avatar.path;

  // Upload de l'image vers Cloudinary
  const resultAvatarTemp = await cloudinary.uploader.upload(avatarToUpload);

  const newProfile = new Profile({
    firstName: firstName,
    lastName: lastName,
    address: {
      street: street,
      city: city,
      state: state,
      zip: zip,
    },
    avatar: resultAvatarTemp.secure_url,
    owner: req.user,
  });

  await newProfile.save();
}

// Utilisez cette fonction dans votre route POST /user/edit_profile
router.post("/user/create_profile", isAuthenticated, async (req, res) => {
  try {
    await createProfile(req); // appelez la fonction créée précédemment
    res.status(201).json({ message: "Profile created successfully!" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

async function updateProfile(req) {
  const { firstName, lastName, street, city, state, zip } = req.fields;
  const fileKeys = Object.keys(req.files);
  let avatarUrl = "";

  if (fileKeys.length > 0) {
    const avatarToUpload = req.files.avatar.path;
    // Upload de l'image vers Cloudinary
    const resultAvatarTemp = await cloudinary.uploader.upload(avatarToUpload);
    avatarUrl = resultAvatarTemp.secure_url;
  }

  // Trouvez le profil correspondant à l'utilisateur actuel
  const profile = await Profile.findOne({ owner: req.user._id });

  if (!profile) {
    throw new Error("Profile not found!");
  }

  // Mettez à jour les propriétés du profil avec les nouvelles valeurs
  if (firstName) {
    profile.firstName = firstName;
  }
  if (lastName) {
    profile.lastName = lastName;
  }
  if (street) {
    profile.address.street = street;
  }
  if (city) {
    profile.address.city = city;
  }
  if (state) {
    profile.address.state = state;
  }
  if (zip) {
    profile.address.zip = zip;
  }
  if (avatarUrl) {
    profile.avatar = avatarUrl;
  }

  await profile.save();
}

// Utilisez cette fonction dans votre route POST /user/edit_profile
router.post("/user/edit_profile", isAuthenticated, async (req, res) => {
  try {
    await updateProfile(req); // appelez la fonction créée précédemment
    res.status(200).json({ message: "Profile updated successfully!" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
