const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Fetches HESCO electricity bill from PITC portal
 *
 * @param {string} refNo - 14-digit reference number from HESCO bill
 * @returns {Promise<Object>} Bill data or error
 *
 * @example
 * const result = await getHESCOBill("06113530462901");
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 */
async function getHESCOBill(refNo) {
  try {
    const baseUrl = "https://bill.pitc.com.pk/hescobill";

    // -------------------------------------------------------------------------
    // STEP 1: Fetch the page to extract ViewState tokens
    // ASP.NET WebForms requires these tokens for form submission
    // -------------------------------------------------------------------------
    const getResponse = await axios.get(baseUrl, {
      timeout: 30000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    // -------------------------------------------------------------------------
    // STEP 2: Parse HTML and extract hidden fields required for form submission
    // -------------------------------------------------------------------------
    const $ = cheerio.load(getResponse.data);

    const viewState = $("#__VIEWSTATE").val();
    const viewStateGenerator = $("#__VIEWSTATEGENERATOR").val();
    const eventValidation = $("#__EVENTVALIDATION").val();
    const requestVerificationToken = $(
      'input[name="__RequestVerificationToken"]'
    ).val();

    // Validate tokens were extracted
    if (!viewState || !viewStateGenerator || !eventValidation) {
      return {
        success: false,
        error: "Failed to extract required tokens from PITC portal",
      };
    }

    // -------------------------------------------------------------------------
    // STEP 3: Submit form with reference number and all required tokens
    // -------------------------------------------------------------------------
    const formData = new URLSearchParams({
      __VIEWSTATE: viewState,
      __VIEWSTATEGENERATOR: viewStateGenerator,
      __EVENTVALIDATION: eventValidation,
      __RequestVerificationToken: requestVerificationToken,
      rbSearchByList: "refno",
      searchTextBox: refNo,
      ruCodeTextBox: "", // 'U' for Urban or 'R' for Rural (empty defaults to U)
      btnSearch: "Search",
    });

    const postResponse = await axios.post(baseUrl, formData.toString(), {
      timeout: 30000,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Referer: baseUrl,
        Cookie: getResponse.headers["set-cookie"]?.join("; ") || "",
      },
      maxRedirects: 5,
    });

    // -------------------------------------------------------------------------
    // STEP 4: Parse the response and check for errors
    // -------------------------------------------------------------------------
    const $result = cheerio.load(postResponse.data);

    // Check for error message in div#ua
    const errorDiv = $result("#ua").text().trim();
    if (errorDiv) {
      return {
        success: false,
        error: errorDiv,
        refNo: refNo,
      };
    }

    // -------------------------------------------------------------------------
    // STEP 5: Parse bill details from successful response
    // -------------------------------------------------------------------------
    const billData = parseBillDetails($result, refNo);

    return {
      success: true,
      refNo: refNo,
      data: billData,
    };
  } catch (error) {
    // Handle specific error types
    if (
      error.code === "ECONNABORTED" ||
      error.code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      return {
        success: false,
        error: "Connection timeout - PITC server may be geo-restricted or down",
      };
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      return {
        success: false,
        error: "Unable to connect to PITC server",
      };
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Parses bill details from the HTML response
 *
 * @param {CheerioStatic} $ - Cheerio object loaded with HTML
 * @param {string} refNo - Reference number
 * @returns {Object} Parsed bill data
 *
 * Note: This function extracts specific fields from the HESCO bill HTML.
 * The selectors may need adjustment based on actual bill structure.
 */
function parseBillDetails($, refNo) {
  // Initialize bill data object
  const billData = {
    referenceNumber: refNo,
    consumerDetails: {},
    billDetails: {},
    charges: {},
    rawHtml: null,
  };

  try {
    // -------------------------------------------------------------------------
    // Parse consumer information
    // These selectors target common patterns in PITC bill pages
    // Adjust based on actual HTML structure when valid bill is available
    // -------------------------------------------------------------------------

    // Look for table rows with bill information
    const tableRows = $("table tr");

    tableRows.each((index, element) => {
      const cells = $(element).find("td");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        const value = $(cells[1]).text().trim();

        // Map common fields
        if (label.includes("consumer") || label.includes("name")) {
          billData.consumerDetails.name = value;
        } else if (label.includes("address")) {
          billData.consumerDetails.address = value;
        } else if (label.includes("customer") || label.includes("id")) {
          billData.consumerDetails.customerId = value;
        } else if (label.includes("tariff")) {
          billData.billDetails.tariff = value;
        } else if (label.includes("due date")) {
          billData.billDetails.dueDate = value;
        } else if (
          label.includes("issue date") ||
          label.includes("bill date")
        ) {
          billData.billDetails.issueDate = value;
        } else if (label.includes("reading date")) {
          billData.billDetails.readingDate = value;
        } else if (label.includes("current reading")) {
          billData.billDetails.currentReading = value;
        } else if (label.includes("previous reading")) {
          billData.billDetails.previousReading = value;
        } else if (label.includes("units") || label.includes("consumption")) {
          billData.billDetails.unitsConsumed = value;
        } else if (
          label.includes("amount payable") ||
          label.includes("total amount")
        ) {
          billData.charges.totalAmount = value;
        } else if (label.includes("after due date")) {
          billData.charges.amountAfterDueDate = value;
        } else if (label.includes("electricity charges")) {
          billData.charges.electricityCharges = value;
        } else if (label.includes("gst") || label.includes("tax")) {
          billData.charges.gst = value;
        }
      }
    });

    // Look for specific divs or spans with bill data
    const billAmountElement = $('[id*="amount"], [class*="amount"]').first();
    if (billAmountElement.length) {
      billData.charges.displayAmount = billAmountElement.text().trim();
    }

    // Store raw HTML for debugging or manual parsing
    billData.rawHtml = $.html();
  } catch (parseError) {
    console.error("Error parsing bill details:", parseError.message);
    // Return partial data with error flag
    billData.parseError = parseError.message;
  }

  return billData;
}

/**
 * Validates HESCO reference number format
 *
 * @param {string} refNo - Reference number to validate
 * @returns {Object} Validation result
 */
function validateReferenceNumber(refNo) {
  if (!refNo) {
    return {
      valid: false,
      error: "Reference number is required",
    };
  }

  // Reference number should be 10-14 digits
  const refNoStr = String(refNo).trim();
  const refNoPattern = /^\d{10,14}$/;

  if (!refNoPattern.test(refNoStr)) {
    return {
      valid: false,
      error: "Reference number must be 10-14 digits",
    };
  }

  return {
    valid: true,
    refNo: refNoStr,
  };
}

module.exports = {
  getHESCOBill,
  validateReferenceNumber,
};
