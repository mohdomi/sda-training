const express = require("express");
const router = express.Router();
const productService = require("../../../services/productService");
const { authMiddleware, authorize } = require("../../../middleware/auth");
const {
  validateProduct,
  validateId,
  validatePagination,
} = require("../../../middleware/validation");

router.get("/", validatePagination, async (req, res, next) => {
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

router.get("/:id", validateId, async (req, res, next) => {
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

router.use(authMiddleware);

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
  validateId,
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
  validateId,
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
