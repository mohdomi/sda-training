const express = require("express");
const router = express.Router();
const productService = require("../../../services/productService");
const { authenticate, authorize } = require("../../../middleware/auth");
const {
  validateProduct,
  validateUuid,
  validatePagination,
} = require("../../../middleware/validation");
const { cache } = require("../../../middleware/caching");

// Products live in PostgreSQL (UUID ids). Public reads are cached in Redis.
router.get("/", validatePagination, cache(60), async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", validateUuid, cache(120), async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

router.use(authenticate);

router.post("/", authorize("admin"), validateProduct, async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  "/:id",
  authorize("admin"),
  validateUuid,
  validateProduct,
  async (req, res, next) => {
    try {
      const product = await productService.updateProduct(
        req.params.id,
        req.body,
      );
      res.json({
        success: true,
        message: "Product updated successfully",
        data: product,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/:id",
  authorize("admin"),
  validateUuid,
  async (req, res, next) => {
    try {
      await productService.deleteProduct(req.params.id);
      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
