const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);

router.post("/payment", async (req, res) => {
  try {
    const { product_name, product_price } = req.fields;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: product_price,
      currency: "eur",
      automatic_payment_methods: { enabled: true },
      description: `Paiement vinted pour : ${product_name}`,
      setup_future_usage: "off_session",
      use_stripe_sdk: true,
    });
    // res.json(paymentIntent);
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
