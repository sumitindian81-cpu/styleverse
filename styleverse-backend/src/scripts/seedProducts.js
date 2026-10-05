require("dotenv").config();
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Category = require("../models/Category");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  // categories fetch by slug (ensure these exist)
  const women = await Category.findOne({ slug: "women" });
  const men = await Category.findOne({ slug: "men" });
  const kids = await Category.findOne({ slug: "kids" });
  const accessories = await Category.findOne({ slug: "accessories" });

  if (!women || !men || !kids || !accessories) {
    console.log(
      "Missing categories. Create categories first: men, women, kids, accessories"
    );
    process.exit(1);
  }

  const types = [
    "top",
    "bottom",
    "dress",
    "shoes",
    "bag",
    "jewelry",
    "accessory",
    "outerwear",
  ];
  const genders = ["men", "women", "kids", "unisex"];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const categoriesByGender = {
    men: men._id,
    women: women._id,
    kids: kids._id,
    unisex: accessories._id,
  };

  const colors = [
    { name: "Black", code: "#000000" },
    { name: "White", code: "#FFFFFF" },
    { name: "Red", code: "#FF0000" },
    { name: "Blue", code: "#0000FF" },
    { name: "Green", code: "#00FF00" },
    { name: "Beige", code: "#F5F5DC" },
    { name: "Brown", code: "#8B4513" },
  ];

  const sizes = ["S", "M", "L", "XL"];

  // Image pools for realistic demo (Pexels links)
  const imagePools = {
    men: {
      top: [
        "https://images.pexels.com/photos/7671166/pexels-photo-7671166.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/7697300/pexels-photo-7697300.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bottom: [
        "https://images.pexels.com/photos/6311646/pexels-photo-6311646.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      outerwear: [
        "https://images.pexels.com/photos/7691088/pexels-photo-7691088.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      shoes: [
        "https://images.pexels.com/photos/1598505/pexels-photo-1598505.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bag: [
        "https://images.pexels.com/photos/6311579/pexels-photo-6311579.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      accessory: [
        "https://images.pexels.com/photos/6311572/pexels-photo-6311572.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      jewelry: [
        "https://images.pexels.com/photos/1158438/pexels-photo-1158438.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      dress: [], // men generally no dress; fallback later
    },
    women: {
      top: [
        "https://images.pexels.com/photos/7697325/pexels-photo-7697325.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/6311577/pexels-photo-6311577.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bottom: [
        "https://images.pexels.com/photos/1036856/pexels-photo-1036856.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      dress: [
        "https://images.pexels.com/photos/6311579/pexels-photo-6311579.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/1394882/pexels-photo-1394882.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      outerwear: [
        "https://images.pexels.com/photos/7691088/pexels-photo-7691088.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      shoes: [
        "https://images.pexels.com/photos/322207/pexels-photo-322207.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bag: [
        "https://images.pexels.com/photos/1132575/pexels-photo-1132575.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      accessory: [
        "https://images.pexels.com/photos/6311581/pexels-photo-6311581.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      jewelry: [
        "https://images.pexels.com/photos/1158438/pexels-photo-1158438.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
    },
    kids: {
      top: [
        "https://images.pexels.com/photos/3539355/pexels-photo-3539355.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bottom: [
        "https://images.pexels.com/photos/3662770/pexels-photo-3662770.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      dress: [
        "https://images.pexels.com/photos/3661553/pexels-photo-3661553.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      outerwear: [
        "https://images.pexels.com/photos/3662910/pexels-photo-3662910.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      shoes: [
        "https://images.pexels.com/photos/1478442/pexels-photo-1478442.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bag: [],
      accessory: [],
      jewelry: [],
    },
    unisex: {
      top: [
        "https://images.pexels.com/photos/7671166/pexels-photo-7671166.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bottom: [
        "https://images.pexels.com/photos/6311633/pexels-photo-6311633.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      dress: [
        "https://images.pexels.com/photos/6311587/pexels-photo-6311587.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      outerwear: [
        "https://images.pexels.com/photos/7697300/pexels-photo-7697300.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      shoes: [
        "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      bag: [
        "https://images.pexels.com/photos/910071/pexels-photo-910071.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      accessory: [
        "https://images.pexels.com/photos/6311581/pexels-photo-6311581.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
      jewelry: [
        "https://images.pexels.com/photos/1158438/pexels-photo-1158438.jpeg?auto=compress&cs=tinysrgb&w=600",
      ],
    },
  };

  const getImageFor = (gender, type) => {
    const poolGroup = imagePools[gender] || imagePools["unisex"];
    const pool = poolGroup[type] || [];

    if (pool.length > 0) {
      return pick(pool);
    }

    // fallback: any unisex top image
    const fallback =
      imagePools["unisex"]["top"][0] ||
      "https://via.placeholder.com/400x500.png?text=Styleverse+Product";
    return fallback;
  };

  const products = [];
  const COUNT = 200; // change to 50/100 if you want faster seeding

  for (let i = 1; i <= COUNT; i++) {
    const type = pick(types);
    const gender = pick(genders);
    const categoryId = categoriesByGender[gender] || accessories._id;

    const name = `${gender.toUpperCase()} ${type.toUpperCase()} Item ${i}`;
    const slug = `${gender}-${type}-item-${i}`;

    const basePrice = rand(299, 2999);
    const imageUrl = getImageFor(gender, type);

    products.push({
      name,
      slug,
      description: `Auto seeded product ${i} for Styleverse.`,
      brand: "Styleverse",
      categoryId,
      price: basePrice,
      mrp: basePrice + rand(50, 500),
      discountPercent: rand(0, 40),
      stock: rand(10, 200),

      sizes:
        type === "shoes" ||
        type === "bag" ||
        type === "jewelry" ||
        type === "accessory"
          ? []
          : sizes.map((s) => ({ size: s, stock: rand(0, 50) })),

      colors: [pick(colors)],

      gender,
      type,

      material: "",
      pattern: "",

      // Updated images with real URLs
      images: [{ url: imageUrl, isMain: true }],

      averageRating: 0,
      totalReviews: 0,

      isFeatured: false,
      isNewArrival: false,
      isBestSeller: false,
      isOnSale: false,

      isCustomizable: ["top", "bottom", "dress", "outerwear"].includes(type)
        ? i % 3 === 0
        : false,

      status: "active",
    });
  }

  await Product.insertMany(products, { ordered: false });
  console.log(`Seeded ${COUNT} products ✅`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});