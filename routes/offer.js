const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

// Import models
const Offer = require("../models/Offer");
const User = require("../models/User");

// Import Cloudinary
cloudinary.config({
  cloud_name: "dw8gk1bl8",
  api_key: "953134798363293",
  api_secret: "4zEBxuthwmlKJmQMAIOD1bXEH9I",
  secure: true,
});

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  // console.log(req.user);

  // Destructuring
  const { title, description, price, condition, city, brand, size, color } =
    req.fields;

  try {
    // Declare newOffer
    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        {
          brand: req.fields.brand,
        },
        {
          size: req.fields.size,
        },
        {
          condition: req.fields.condition,
        },
        {
          color: req.fields.color,
        },
        {
          city: req.fields.city,
        },
      ],
      owner: req.user,
    });

    // console.log(newOffer);

    // Uploader picture
    let picture = req.files.picture.path;
    const result = await cloudinary.uploader.upload(picture, {
      folder: `/vinted/offers/${newOffer._id}`,
    });
    // console.log(pictureUpload.secure_url);

    // Display the result of the upload in the offer
    newOffer.product_image = result;
    // Save newOffer
    await newOffer.save();
    res.json(newOffer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offers", async (req, res) => {
  try {
    const filters = {};
    let sort = {};

    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
      // add a key product_name to the object filters
      // this key has value new RegExp(req.query.title, "i")
    }

    if (req.query.priceMin) {
      filters.product_price = { gte: Number(req.query.priceMin) };
    }

    if (req.query.priceMax) {
      if (filters.produtc_price) {
        filters.product_price.$lte = Number(req.query.priceMax);
      } else {
        filters.product_price = { $lte: Number(req.query.priceMax) };
      }
    }

    if (req.query.sort === "price-asc") {
      sort = { product_price: 1 };
    } else if (req.query.sort === "price-desc") {
      sort = { product_price: -1 };
    }

    let page;
    const limit = Number(req.query.limit);

    if (Number(req.query.page < 1)) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }

    const offers = await Offer.find(filters)
      .populate({ path: "owner", select: "account" })
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("product_name product_price");

    const count = await Offer.countDocuments(filters); // give the number of documents that matches with filters

    res.status(200).json({ count: count, offers: offers });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account",
    });
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
