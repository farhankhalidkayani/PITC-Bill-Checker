# PITC Bill Checker API

A REST API for fetching electricity bills from **all major Pakistani Distribution Companies (DISCOs)** via the official PITC government portal.

## Overview

This service scrapes bill data directly from the official PITC portal (`https://bill.pitc.com.pk`) without relying on third-party APIs. It handles ASP.NET WebForms authentication and form submission automatically.

## Supported Companies

- ✅ **HESCO** - Hyderabad Electric Supply Company
- ✅ **LESCO** - Lahore Electric Supply Company
- ✅ **FESCO** - Faisalabad Electric Supply Company
- ✅ **IESCO** - Islamabad Electric Supply Company
- ✅ **MEPCO** - Multan Electric Power Company
- ✅ **GEPCO** - Gujranwala Electric Power Company
- ✅ **PESCO** - Peshawar Electric Supply Company
- ✅ **QESCO** - Quetta Electric Supply Company
- ✅ **SEPCO** - Sukkur Electric Power Company

## Features

- ✅ Support for all 9 major Pakistani DISCOs
- ✅ Direct access to official PITC portal
- ✅ Handles ASP.NET ViewState tokens automatically
- ✅ RESTful API with GET and POST endpoints
- ✅ Input validation
- ✅ Comprehensive error handling
- ✅ CORS enabled
- ✅ Health check endpoint
- ✅ Backward compatibility (defaults to HESCO)

## Installation

```bash
pnpm install
```

## Dependencies

- **axios** - HTTP client for making requests
- **cheerio** - HTML parsing and scraping
- **express** - REST API framework

## Usage

### Start the API Server

```bash
node server.js
```

The server will start on port 3000 (default) or the port specified in `PORT` environment variable.

### Direct Module Usage

You can also use the core module directly without the API server:

```bash
node index.js <reference-number> [company]
```

Examples:
```bash
# Check LESCO bill
node index.js 06113530462901 lesco

# Check HESCO bill (default if company not specified)
node index.js 12345678901234 hesco

# Check FESCO bill
node index.js 98765432109876 fesco
```

## API Endpoints

### Root Endpoint

```
GET /
```

Returns API information and available endpoints.

**Response:**
```json
{
  "status": "online",
  "service": "PITC Bill Checker API",
  "version": "2.0.0",
  "description": "Check electricity bills from all major Pakistani DISCOs",
  "supportedCompanies": [
    { "code": "hesco", "name": "Hyderabad Electric Supply Company" },
    { "code": "lesco", "name": "Lahore Electric Supply Company" },
    { "code": "fesco", "name": "Faisalabad Electric Supply Company" },
    { "code": "iesco", "name": "Islamabad Electric Supply Company" },
    { "code": "mepco", "name": "Multan Electric Power Company" },
    { "code": "gepco", "name": "Gujranwala Electric Power Company" },
    { "code": "pesco", "name": "Peshawar Electric Supply Company" },
    { "code": "qesco", "name": "Quetta Electric Supply Company" },
    { "code": "sepco", "name": "Sukkur Electric Power Company" }
  ],
  "endpoints": {
    "checkBill": "/api/check-bill?refNo={reference-number}&company={company-code}",
    "companies": "/api/companies",
    "health": "/health"
  }
}
```

### Health Check

```
GET /health
```

Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-30T19:11:56.628Z"
}
```

### Get Supported Companies

```
GET /api/companies
```

Returns list of all supported electricity companies.

**Response:**
```json
{
  "success": true,
  "companies": [
    { "code": "hesco", "name": "Hyderabad Electric Supply Company" },
    { "code": "lesco", "name": "Lahore Electric Supply Company" },
    ...
  ]
}
```

### Check Bill (GET)

```
GET /api/check-bill?refNo={reference-number}&company={company-code}
```

**Parameters:**
- `refNo` (required) - 10-14 digit reference number from your electricity bill
- `company` (optional) - Company code (hesco, lesco, fesco, iesco, mepco, gepco, pesco, qesco, sepco). Defaults to `hesco` for backward compatibility

**Success Response (200):**
```json
{
  "success": true,
  "refNo": "06113530462901",
  "data": {
    "referenceNumber": "06113530462901",
    "consumerDetails": {
      "name": "John Doe",
      "address": "123 Main St",
      "customerId": "12345"
    },
    "billDetails": {
      "dueDate": "2025-11-15",
      "issueDate": "2025-10-30",
      "unitsConsumed": "350"
    },
    "charges": {
      "totalAmount": "5000",
      "electricityCharges": "4500",
      "gst": "500"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "The given input does not belongs to HESCO",
  "refNo": "06113530462901"
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": "Reference number must be 10-14 digits"
}
```

### Check Bill (POST)

```
POST /api/check-bill
Content-Type: application/json
```

**Body:**
```json
{
  "refNo": "06113530462901",
  "company": "lesco"
}
```

**Response:** Same as GET endpoint

**Note:** The `company` parameter is optional and defaults to `hesco` for backward compatibility

## How It Works

The API performs a three-step process to fetch bill data:

1. **GET Request** - Fetches the company's bill page from PITC portal to extract ASP.NET ViewState tokens:
   - `__VIEWSTATE`
   - `__VIEWSTATEGENERATOR`
   - `__EVENTVALIDATION`
   - `__RequestVerificationToken`

2. **POST Request** - Submits the form with:
   - All extracted tokens
   - Reference number
   - Company-specific URL
   - Proper headers (User-Agent, Referer, Cookies)

3. **Parse Response** - Extracts bill data from HTML or returns error message

## Error Handling

The API handles various error scenarios:

- **Invalid company code** - Returns 400 with list of supported companies
- **Invalid reference number format** - Returns 400 with validation error
- **Reference number not found** - Returns 404 with company-specific error message
- **Wrong company** - Returns 404 if reference number belongs to different company
- **Connection timeout** - Returns error indicating geo-restriction or server down
- **Network errors** - Returns appropriate error message
- **Server errors** - Returns 500 with internal error message

## Notes

### Geo-Restrictions

The PITC portal may be geo-restricted or have connectivity issues when accessed from outside Pakistan. If you encounter timeout errors, consider:

- Using a VPN with a Pakistan endpoint
- Deploying the service in a Pakistan-based data center
- Adding retry logic with exponential backoff

### Reference Number Format

Valid reference numbers for all companies are:
- 10-14 digits
- Found on your physical electricity bill
- Examples:
  - LESCO: `06113530462901`
  - HESCO: `12345678901234`
  - FESCO: `98765432109876`

### HTML Parsing

The `parseBillDetails()` function in `pitc-bill.js` contains generic selectors for common bill fields across all companies. The selectors work for most DISCOs, but you may need to adjust them based on the actual HTML structure. To do this:

1. Get a valid reference number for any company
2. Run the test script to capture the HTML
3. Inspect the HTML structure
4. Update selectors in `parseBillDetails()` function if needed

## File Structure

```
PITC-Bill-Checker/
├── index.js           # Test script for direct module usage
├── pitc-bill.js       # Core multi-company scraping logic
├── hesco-bill.js      # Legacy HESCO-only module (deprecated)
├── server.js          # Express API server
├── package.json       # Dependencies
├── README.md          # This file
├── .gitignore         # Git ignore rules
└── node_modules/      # Installed packages
```

## Development

### Testing with cURL

```bash
# Test root endpoint
curl http://localhost:3000/

# Test health check
curl http://localhost:3000/health

# Get supported companies
curl http://localhost:3000/api/companies

# Test LESCO bill fetch (GET)
curl "http://localhost:3000/api/check-bill?refNo=06113530462901&company=lesco"

# Test HESCO bill fetch (GET - backward compatible)
curl "http://localhost:3000/api/check-bill?refNo=12345678901234"

# Test LESCO bill fetch (POST)
curl -X POST http://localhost:3000/api/check-bill \
  -H "Content-Type: application/json" \
  -d '{"refNo": "06113530462901", "company": "lesco"}'

# Test validation
curl "http://localhost:3000/api/check-bill?refNo=123&company=fesco"

# Test invalid company
curl "http://localhost:3000/api/check-bill?refNo=06113530462901&company=invalid"
```

### Environment Variables

- `PORT` - Server port (default: 3000)
- `PROXY_URL` - Pakistan proxy URL to bypass geo-restrictions (optional)

**Format:**
```bash
# Without authentication
PROXY_URL=http://proxy-host:port

# With authentication
PROXY_URL=http://username:password@proxy-host:port
```

**Example:**
```bash
PORT=8080 PROXY_URL=http://pk-proxy.example.com:8080 node server.js
```

**Finding Pakistan Proxies:**

**Free Options** (not recommended for production):
- https://free-proxy-list.net/ (filter by Pakistan)
- https://www.proxy-list.download/HTTPS (filter by Pakistan)
- https://www.sslproxies.org/ (filter by Pakistan)

**Paid Services** (recommended for production):
- **Bright Data** - https://brightdata.com/ (has Pakistan IPs)
- **Oxylabs** - https://oxylabs.io/ (residential proxies)
- **SmartProxy** - https://smartproxy.com/ (datacenter + residential)
- **Webshare** - https://www.webshare.io/ (affordable, reliable)

## Production Deployment

For production use:

1. Set appropriate `PORT` environment variable
2. **Set `PROXY_URL` if deploying outside Pakistan** (required for Vercel, Netlify, etc.)
3. Use a process manager (PM2, systemd)
4. Add rate limiting middleware
5. Implement caching for frequently requested bills
6. Add logging with proper log management
7. Use HTTPS with reverse proxy (nginx, caddy)
8. Monitor server health and uptime

### Deploying to Vercel with Proxy

1. Get a Pakistan proxy (see Environment Variables section)
2. Add `PROXY_URL` environment variable in Vercel dashboard:
   - Go to: Settings → Environment Variables
   - Add: `PROXY_URL` = `http://your-proxy:port`
3. Redeploy your application

**Example Vercel Environment Variables:**
```
PORT=3000
PROXY_URL=http://pk-proxy.example.com:8080
```

### PM2 Example

```bash
pnpm add -g pm2
pm2 start server.js --name pitc-bill-checker
pm2 save
pm2 startup
```

## License

ISC

## Support

For issues or questions about the HESCO billing system, contact HESCO directly at http://www.hesco.gov.pk/

For issues with this API, please check the error messages and logs.

