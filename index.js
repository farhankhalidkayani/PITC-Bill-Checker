/**
 * PITC Bill Fetcher - Test Script
 *
 * This script demonstrates direct usage of the pitc-bill module
 * For production use, run server.js to start the REST API
 *
 * Usage:
 *   node index.js <refNo> [company]
 *
 * Examples:
 *   node index.js 06113530462901 lesco
 *   node index.js 12345678901234 hesco
 *   node index.js 98765432109876 fesco
 */

const { getPITCBill, getSupportedCompanies } = require("./pitc-bill");

// Parse arguments
const testRefNo = process.argv[2];
const company = (process.argv[3] || "hesco").toLowerCase();

// Display help if no reference number provided
if (!testRefNo) {
  console.log("❌ Reference number is required");
  console.log("\nUsage: node index.js <refNo> [company]\n");
  console.log("Supported companies:");
  getSupportedCompanies().forEach((c) => {
    console.log(`  • ${c.code.toUpperCase().padEnd(10)} - ${c.name}`);
  });
  console.log("\nExamples:");
  console.log("  node index.js 06113530462901 lesco");
  console.log("  node index.js 12345678901234 hesco");
  process.exit(1);
}

console.log(
  `🔍 Fetching ${company.toUpperCase()} bill for reference: ${testRefNo}`
);
console.log("---------------------------------------------------");

getPITCBill(testRefNo, company)
  .then((result) => {
    if (result.success) {
      console.log("✅ Bill retrieved successfully!");
      console.log(`🏢 Company: ${result.companyName}`);
      console.log("\n📄 Bill Data:");
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("❌ Failed to retrieve bill");
      console.log(`Error: ${result.error}`);
    }
    console.log("---------------------------------------------------");
  })
  .catch((err) => {
    console.error("💥 Unexpected error:", err.message);
  });
