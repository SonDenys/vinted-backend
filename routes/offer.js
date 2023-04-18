const express = require("express");
const isAuthenticated = require("../middlewares/isAuthenticated");
const router = express.Router();
const cloudinary = require("cloudinary").v2;
const fileUpload = require("express-fileupload");

// Import models
const Offer = require("../models/Offer");

// Import Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ** -------------------- Cette route permet de publier une nouvelle offre. -------------------------- **
// Elle nécessite d'être authentifié grâce à "isAuthenticated"
router.post("/offer/publish", isAuthenticated, async (req, res) => {
  // Extraction des champs de la requête
  const { title, description, price, condition, city, brand, size, color } =
    req.fields;
  // Récupération des clés des fichiers uploadés
  const fileKeys = Object.keys(req.files);

  // Vérification si un fichier a été uploadé
  if (fileKeys.length === 0) {
    res.send("No file uploaded!");
    return;
  }

  try {
    // Récupération du chemin vers l'image uploadée
    let pictureToUpload = req.files.picture.path;
    // Upload de l'image vers Cloudinary
    const resultPictureTemp = await cloudinary.uploader.upload(
      pictureToUpload,
      {}
    );

    // Création d'un nouvelle offre avec les informations fournies par l'utilisateur
    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: {
        brand,
        size,
        condition,
        color,
        city,
        picture: resultPictureTemp.secure_url, // Url sécurisé de l'image uploadée
      },
      owner: req.user, // Propriétaire de l'offre (l'utilisateur authentifié)
    });

    // Enregistrement de la nouvelle offre dans la base de données
    await newOffer.save();

    // Renommage et déplacement de l'image uploadée vers la destination finale sur Cloudinary
    const resultPictureFinal = await cloudinary.uploader.rename(
      resultPictureTemp.public_id,
      `vinted/offers/${newOffer._id}`
    );

    // Mise à jour de l'url de l'image dans la base de données avec l'url finale
    newOffer.product_details.picture = resultPictureFinal.secure_url;
    await newOffer.save();

    // Renvoi de la nouvelle offre créée au format JSON
    res.json(newOffer);
  } catch (error) {
    console.error(error);
    // En cas d'erreur, renvoi d'un message d'erreur au format JSON avec un code 400 (Bad Request)
    res.status(400).json({ message: error.message });
  }
});

// ** ------------- définition de la route pour récupérer toutes les offres avec éventuellement des filtres et un tri ------------------ **
router.get("/offers", async (req, res) => {
  try {
    // on extrait les paramètres de recherche (nom du produit, prix min et max, critère de tri) de la requête
    const { product_name, priceMin, priceMax, sort } = req.query;

    // on crée un objet "filters" qui va contenir les conditions de recherche à appliquer sur la collection d'offres
    const filters = {};
    if (product_name) {
      // si un nom de produit est fourni, on crée une expression régulière insensible à la casse pour rechercher les offres contenant ce nom
      filters.product_name = new RegExp(product_name, "i");
    }
    if (priceMin && priceMax) {
      // si un prix minimum et un prix maximum sont fournis, on cherche les offres dont le prix est compris entre ces deux valeurs
      filters.product_price = { $gte: priceMin, $lte: priceMax };
    } else if (priceMin) {
      // si seul un prix minimum est fourni, on cherche les offres dont le prix est supérieur ou égal à cette valeur
      filters.product_price = { $gte: priceMin };
    } else if (priceMax) {
      // si seul un prix maximum est fourni, on cherche les offres dont le prix est inférieur ou égal à cette valeur
      filters.product_price = { $lte: priceMax };
    }

    // on crée un objet "sortParam" qui va contenir les critères de tri à appliquer sur la collection d'offres
    let sortParam = {};
    if (sort === "price-asc") {
      // si le critère de tri est "price-asc", on trie les offres par ordre croissant de prix
      sortParam = { product_price: 1 };
    } else if (sort === "price-desc") {
      // si le critère de tri est "price-desc", on trie les offres par ordre décroissant de prix
      sortParam = { product_price: -1 };
    }

    // on récupère les numéros de page et de limit depuis la requête, en les transformant en entiers
    const pageNum = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    // on compte le nombre d'offres qui satisfont les conditions de recherche
    const count = await Offer.countDocuments(filters);

    // on récupère les offres correspondantes aux conditions de recherche, avec les éventuels tris et pagination, en incluant les informations sur le propriétaire de chaque offre
    const offers = await Offer.find(filters)
      .sort(sortParam)
      .skip((pageNum - 1) * limit)
      .limit(limit)
      .populate("owner", "account");

    // on renvoie une réponse JSON contenant le nombre total d'offres et la liste des offres correspondantes
    res.json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    console.error(error);
    // en cas d'erreur, on renvoie une réponse d'erreur avec un code HTTP 400 et le message d'erreur
    res.status(400).json({ error: error.message });
  }
});

// ** -------------- définition de la route pour récupérer une offre spécifique ------------------- **
router.get("/offer/:id", async (req, res) => {
  try {
    // tentative de récupération de l'offre correspondant à l'ID fourni par l'utilisateur, en incluant les informations sur le propriétaire de l'offre
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account",
    });

    // envoi de la réponse HTTP avec un code 200 (OK) et les données de l'offre
    res.status(200).json(offer);
  } catch (error) {
    // gestion des erreurs : si une erreur se produit dans le bloc try, on la traite ici
    // envoi d'une réponse d'erreur avec un code HTTP 400 et le message d'erreur
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
