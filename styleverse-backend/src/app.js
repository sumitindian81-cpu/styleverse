const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

dotenv.config();

const addressRoutes = require("./routes/addressRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const couponRoutes = require("./routes/couponRoutes");
const adminCouponRoutes = require("./routes/adminCouponRoutes");
const studioRoutes = require("./routes/studioRoutes");
const customDesignRoutes = require("./routes/customDesignRoutes");
const outfitRoutes = require("./routes/outfitRoutes");

const adminStatsRoutes = require("./routes/adminStatsRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const adminOrderRoutes = require("./routes/adminOrderRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");

const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const bodyProfileRoutes = require("./routes/bodyProfileRoutes");

const app = express();

/*
 * =====================================================
 * SECURITY
 * =====================================================
 */
app.use(helmet());

/*
 * =====================================================
 * CORS
 * =====================================================
 */
const allowedOrigins = [
  "http://localhost:5173",
  "https://styleverse-lilac.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      /*
       * Allow requests without an Origin header
       * such as Thunder Client / Postman.
       */
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,
  })
);

/*
 * =====================================================
 * BASIC MIDDLEWARE
 * =====================================================
 */
app.use(cookieParser());
app.use(morgan("dev"));

/*
 * =====================================================
 * RAZORPAY WEBHOOK
 * =====================================================
 *
 * IMPORTANT:
 * The webhook must receive the raw body.
 *
 * This route is mounted BEFORE express.json().
 */
app.use(
  "/api/payments/razorpay/webhook",
  express.raw({
    type: "application/json",
  })
);

/*
 * =====================================================
 * BODY PARSERS
 * =====================================================
 *
 * These must come AFTER the Razorpay webhook route.
 */
app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/*
 * =====================================================
 * ROUTES
 * =====================================================
 */

/*
 * Health + Authentication
 */
app.use(
  "/api/health",
  healthRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

/*
 * Main e-commerce
 */
app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/cart",
  cartRoutes
);

app.use(
  "/api/wishlist",
  wishlistRoutes
);

app.use(
  "/api/addresses",
  addressRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

/*
 * Coupons
 */
app.use(
  "/api/coupons",
  couponRoutes
);

app.use(
  "/api/admin/coupons",
  adminCouponRoutes
);

/*
 * Styleverse Studio / Outfit Builder
 */
app.use(
  "/api/studio",
  studioRoutes
);

app.use(
  "/api/custom-designs",
  customDesignRoutes
);

app.use(
  "/api/outfits",
  outfitRoutes
);

/*
 * Admin
 */
app.use(
  "/api/admin",
  adminStatsRoutes
);

app.use(
  "/api/admin",
  adminProductRoutes
);

app.use(
  "/api/admin",
  adminOrderRoutes
);

app.use(
  "/api/admin",
  adminUserRoutes
);

app.use(
  "/api/body-profiles",
  bodyProfileRoutes
);

/*
 * =====================================================
 * JSON 404 HANDLER
 * =====================================================
 */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

/*
 * =====================================================
 * GLOBAL ERROR HANDLER
 * =====================================================
 */
app.use((err, req, res, next) => {
  console.error(
    "Error middleware:",
    err
  );

  return res.status(
    err.statusCode || 500
  ).json({
    success: false,
    message:
      err.message ||
      "Server Error",
  });
});

module.exports = app;