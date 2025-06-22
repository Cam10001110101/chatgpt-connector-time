# Plan to Make the Time Server Compatible with ChatGPT Connectors

This document outlines the plan to upgrade the existing `time` MCP server to be compatible with ChatGPT Connectors, specifically for the "deep research" functionality as specified by OpenAI.

## 1. Objective

The primary goal is to implement the mandatory `search` and `fetch` tools required by ChatGPT Connectors for deep research. This will involve creating a searchable data source and adding the necessary logic to the server.

## 2. Data Source Creation

Since the current server is stateless and computes time-related information on the fly, it lacks a data source to search. We will create a new file named `time_records.json` in the `src` directory to serve as a simple, searchable database.

### `src/time_records.json`

This file will contain an array of JSON objects, where each object represents a significant event, fact, or concept related to time. Each object will adhere to the following structure:

```json
[
  {
    "id": "string",
    "title": "string",
    "text": "string",
    "url": "string (optional)",
    "metadata": {
      "category": "string",
      "year": "number"
    }
  }
]
```

**Example Entry:**

```json
{
  "id": "gregorian-calendar",
  "title": "The Gregorian Calendar",
  "text": "The Gregorian calendar is the most widely used civil calendar in the world. It was introduced in October 1582 by Pope Gregory XIII as a modification of, and replacement for, the Julian calendar.",
  "url": "https://en.wikipedia.org/wiki/Gregorian_calendar",
  "metadata": {
    "category": "Calendars",
    "year": "1582"
  }
}
```

## 3. Server Implementation (`src/index.ts`)

The core logic of the server in `src/index.ts` will be updated to support the new functionality.

### Step 3.1: Load Data

The server will start by loading and parsing the `src/time_records.json` file into memory. A lookup map will also be created for efficient fetching by ID.

### Step 3.2: Define `search` and `fetch` Tools

The `tools` constant array will be extended to include the definitions for `search` and `fetch`, following the schema provided in the OpenAI documentation.

**`search` tool definition:**
- **name**: `search`
- **description**: "Searches for time-related facts and historical events."
- **input_schema**: An object with a single `query` property (string).
- **output_schema**: An object with a `results` property, which is an array of objects containing `id`, `title`, and `text`.

**`fetch` tool definition:**
- **name**: `fetch`
- **description**: "Retrieves the full details of a specific time-related fact or event by its ID."
- **input_schema**: An object with a single `id` property (string).
- **output_schema**: An object representing a full record, including `id`, `title`, `text`, `url`, and `metadata`.

### Step 3.3: Implement Tool Execution Logic

The `executeTool` function will be updated with `case` statements for the new tools.

**`search` logic:**
- It will perform a case-insensitive keyword search on the `title` and `text` fields of each record in the loaded data.
- It will return a list of matching records, formatted according to the `search` tool's `output_schema`.

**`fetch` logic:**
- It will use the pre-built lookup map to find a record by its `id`.
- If found, it will return the complete record.
- If not found, it will return an appropriate error.

## 4. Validation and Testing

After implementation, the server will be tested to ensure it correctly exposes and executes the `search` and `fetch` tools according to the MCP specification. This can be done by running the server locally and using a tool like `curl` or Postman to send JSON-RPC requests for `tools/list`, `tools/call` with the `search` tool, and `tools/call` with the `fetch` tool.

## 5. Deployment Plan

To deploy the ChatGPT Connector compatible time server:

1. **Configure Cloudflare Workers deployment**
   - ✅ Set up wrangler.toml for Cloudflare Workers
   - ✅ Add deployment scripts to package.json (`deploy` and `dev` commands)

2. **Deploy to Cloudflare Workers**
   - ✅ Custom domain configured: `gpt.time.mcpcentral.io`
   - ✅ Default `.dev` domains disabled for security
   - Run `npm run deploy` to build and deploy the server
   - Verify the server is accessible via HTTPS at `https://gpt.time.mcpcentral.io`

3. **Test OpenAI compatibility**
   - Test with ChatGPT's connector interface using the production URL
   - Verify search and fetch tools work correctly
   - Test the deep research functionality

4. **Integration with ChatGPT**
   - Add `https://gpt.time.mcpcentral.io` as a custom connector in ChatGPT
   - Configure the connector for deep research use
   - Test end-to-end functionality with the production domain

## 6. Implementation Status

✅ **COMPLETED:**
- Updated `src/index.ts` with required `search` and `fetch` tools
- Created `src/time_records.json` with searchable time-related data
- Added comprehensive error handling and input validation
- Configured deployment setup (wrangler.toml and package.json scripts)

🔄 **NEXT STEPS:**
- Deploy to Cloudflare Workers
- Test with ChatGPT Connectors
- Validate deep research functionality
