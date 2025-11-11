#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerApexTools } from "./tools/apex.js";
import { registerOrgTools } from "./tools/orgs.js";
import { registerRecordTools } from "./tools/records.js";
import { registerSObjectTools } from "./tools/sobjects.js";
import { registerQueryTools } from "./tools/query.js";
import { registerAdminTools } from "./tools/admin.js";
import { registerCodeAnalyzerTools } from "./tools/code-analyzer.js";
import { registerScannerTools } from "./tools/scanner.js";
import { registerPackageTools } from "./tools/package.js";
import { registerSchemaTools } from "./tools/schema.js";
import { registerSearchTools } from "./tools/search.js";
import { registerLightningTools } from "./tools/lightning.js";
import { registerProjectTools } from "./tools/project.js";
const server = new McpServer({
    name: "perrynet@salesforce-cli-server",
    version: "2.0.0",
    description: `Salesforce MCP Server v2.0.0 - Project-based Salesforce automation via CLI integration\n` +
        `Capabilities: Apex execution, SOQL queries, org management, code testing & coverage\n` +
        `Authentication: Uses local SF CLI configuration from project .sf directory\n` +
        `Tools: 38 available (apex, query with raw SOQL + Tooling API, search, sobject, org management, records, code analyzer, scanner, package, schema, lightning, project deployment)`,
    capabilities: {
        tools: {},
    },
});
registerApexTools(server);
registerOrgTools(server);
registerRecordTools(server);
registerSObjectTools(server);
registerQueryTools(server);
registerAdminTools(server);
registerCodeAnalyzerTools(server);
registerScannerTools(server);
registerPackageTools(server);
registerSchemaTools(server);
registerSearchTools(server);
registerLightningTools(server);
registerProjectTools(server);
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Salesforce MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
