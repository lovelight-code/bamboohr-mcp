#!/usr/bin/env node

// bamboohr-mcp — a read-only BambooHR MCP server (a fork of
// evrimalacan/mcp-bamboohr). Every registered tool is a GET; the HTTP
// client exposes no write methods. See README + NOTICE.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveEnabledTools } from "./enabledTools.js";

// Import tool schemas and handlers
import {
  getEmployee,
  getEmployeeDirectory,
  getEmployeeDirectorySchema,
  getEmployeeGoals,
  getEmployeeGoalsSchema,
  getEmployeePhoto,
  getEmployeePhotoSchema,
  getEmployeeSchema,
} from './tools/employees.js';

import {
  estimateTimeOffBalance,
  estimateTimeOffBalanceSchema,
  getTimeOffRequests,
  getTimeOffRequestsSchema,
  getWhosOut,
  getWhosOutSchema,
} from './tools/timeOff.js';

import {
  getCompanyFile,
  getCompanyFileSchema,
  getMetaFields,
  getMetaFieldsSchema,
  listCompanyFiles,
  listCompanyFilesSchema,
} from './tools/meta.js';

// Create the BambooHR MCP server
const server = new McpServer({
  name: "bamboohr",
  version: "0.1.3"
});

// Every tool this server *can* expose. An operator activates/deactivates
// tools purely via the BAMBOO_ENABLED_TOOLS env — no code change. (Useful to
// keep tools whose BambooHR OAuth scope you didn't grant switched off, so the
// agent is never offered a tool that would 403.)
const ALL_TOOL_NAMES = [
  "get-employee",
  "get-employee-photo",
  "get-employee-directory",
  "get-employee-goals",
  "estimate-time-off-balance",
  "get-time-off-requests",
  "get-whos-out",
  "list-company-files",
  "get-company-file",
  "get-meta-fields",
];

const { enabled, unknown } = resolveEnabledTools(
  process.env.BAMBOO_ENABLED_TOOLS,
  ALL_TOOL_NAMES,
);
if (unknown.length > 0) {
  // Don't fail — just warn (to stderr; stdout is the JSON-RPC channel).
  console.error(
    `[bamboohr] BAMBOO_ENABLED_TOOLS lists unknown tool(s), ignored: ${unknown.join(", ")}`,
  );
}
const enabledSet = new Set(enabled);

// Register a tool only if it's in the active set. `def`/`handler` are `any`:
// the SDK's registerTool is overloaded per Zod shape, so a shared wrapper
// can't carry a single static type — the schemas are typed at their source.
function reg(name: string, def: any, handler: any): void {
  if (enabledSet.has(name)) server.registerTool(name, def, handler);
}

// Employee Tools
reg("get-employee", {
  title: "Get Employee",
  description: "Get employee data with customizable field selection. Returns employee object with fields like displayName, firstName, lastName, jobTitle, department, division, location, supervisor, photoUrl, and many more based on the 'fields' parameter.",
  inputSchema: getEmployeeSchema.shape,
}, getEmployee);

reg("get-employee-photo", {
  title: "Get Employee Photo",
  description: "Get an employee photo by size",
  inputSchema: getEmployeePhotoSchema.shape,
}, getEmployeePhoto);

reg("get-employee-directory", {
  title: "Get Employee Directory",
  description: "Get the company-wide employee directory. Returns array of employee objects with comprehensive information including displayName, jobTitle, department, division, location, supervisor, workEmail, photoUrl, and more.",
  inputSchema: getEmployeeDirectorySchema.shape,
}, getEmployeeDirectory);

reg("get-employee-goals", {
  title: "Get Employee Goals",
  description: "Get performance goals and objectives for an employee. Returns goal objects with title, description, percentComplete, status, dueDate, milestones (for milestone-based goals), and progress tracking information.",
  inputSchema: getEmployeeGoalsSchema.shape,
}, getEmployeeGoals);

// Time Off Tools
reg("estimate-time-off-balance", {
  title: "Estimate Future Time Off Balance",
  description: "Calculate future time off balances for an employee. Returns array of time off types with current balance, units (days/hours), policyType (accruing/discretionary/manual), and usedYearToDate amounts.",
  inputSchema: estimateTimeOffBalanceSchema.shape,
}, estimateTimeOffBalance);

reg("get-time-off-requests", {
  title: "Get Time Off Requests",
  description: "Retrieve and filter time off requests. Returns request objects with id, employeeId, status, start/end dates, request type, amount, available actions (approve/deny/etc.), and employee/manager notes. Supports extensive filtering.",
  inputSchema: getTimeOffRequestsSchema.shape,
}, getTimeOffRequests);

reg("get-whos-out", {
  title: "Get Who's Out",
  description: "View upcoming time off and holidays for a date range. Returns array of mixed events: timeOff events (id, type, employeeId, name, start, end) and holiday events (id, type, name, start, end) with summary counts.",
  inputSchema: getWhosOutSchema.shape,
}, getWhosOut);

// Company/Meta Tools
reg("list-company-files", {
  title: "List Company Files",
  description: "Browse available company files and categories. Returns organized structure with file categories, each containing files with id, name, originalFileName, size, dateCreated, and category information.",
  inputSchema: listCompanyFilesSchema.shape,
}, listCompanyFiles);

reg("get-company-file", {
  title: "Get Company File",
  description: "Download a specific company document by ID. Returns file data with base64-encoded content for binary files (PDFs, images, etc.) along with file size and metadata.",
  inputSchema: getCompanyFileSchema.shape,
}, getCompanyFile);

reg("get-meta-fields", {
  title: "Get Meta Fields",
  description: "Discover all available BambooHR data fields. Returns array of field definitions with id, type (text/email/list/etc.), name, and optional alias. Essential for understanding what employee data fields can be requested.",
  inputSchema: getMetaFieldsSchema.shape,
}, getMetaFields);

console.error(`[bamboohr] registered ${enabled.length}/${ALL_TOOL_NAMES.length} tools: ${enabled.join(", ")}`);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("BambooHR MCP Server is running...");
