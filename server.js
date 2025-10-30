const express = require("express");
const {
  getPITCBill,
  validateReferenceNumber,
  getSupportedCompanies,
} = require("./pitc-bill");
const { getHESCOBill } = require("./hesco-bill");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

/**
 * Health check endpoint
 */
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "PITC Bill Checker API",
    version: "2.0.0",
    description: "Check electricity bills from all major Pakistani DISCOs",
    supportedCompanies: getSupportedCompanies(),
    endpoints: {
      checkBill:
        "/api/check-bill?refNo={reference-number}&company={company-code}",
      checkBillLegacy: "/api/check-bill?refNo={reference-number} (HESCO only)",
      companies: "/api/companies",
      health: "/health",
    },
  });
});

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get list of supported companies
 *
 * GET /api/companies
 */
app.get("/api/companies", (req, res) => {
  res.json({
    success: true,
    companies: getSupportedCompanies(),
  });
});

/**
 * Main endpoint to fetch electricity bill
 *
 * GET /api/check-bill?refNo=06113530462901&company=lesco
 *
 * @query {string} refNo - 10-14 digit reference number
 * @query {string} company - Company code (hesco, lesco, fesco, etc.) - defaults to hesco for backward compatibility
 * @returns {Object} Bill data or error
 */
app.get("/api/check-bill", async (req, res) => {
  const { refNo, company = "hesco" } = req.query;

  // Validate reference number
  const validation = validateReferenceNumber(refNo);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  try {
    // Fetch bill from PITC portal
    const result = await getPITCBill(validation.refNo, company);

    if (result.success) {
      return res.json(result);
    } else {
      // Return 404 for invalid reference numbers or not found
      return res.status(404).json(result);
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * POST endpoint (alternative to GET)
 *
 * POST /api/check-bill
 * Body: { "refNo": "06113530462901", "company": "lesco" }
 */
app.post("/api/check-bill", async (req, res) => {
  const { refNo, company = "hesco" } = req.body;

  // Validate reference number
  const validation = validateReferenceNumber(refNo);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error,
    });
  }

  try {
    // Fetch bill from PITC portal
    const result = await getPITCBill(validation.refNo, company);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /api/check-bill?refNo={reference-number}&company={company-code}",
      "POST /api/check-bill with body: { refNo: '...', company: '...' }",
      "GET /api/companies - Get list of supported companies",
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PITC Bill Checker API server running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/check-bill`);
  console.log(`🏢 Supported companies: http://localhost:${PORT}/api/companies`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
