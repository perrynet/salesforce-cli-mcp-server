import { z } from "zod";
/**
 * Base parameters required for all Salesforce MCP tools
 * These parameters enable project-based authentication and org targeting
 */
export const baseToolParams = z.object({
    sourcePath: z
        .string()
        .describe("Absolute path to the Salesforce DX project directory. " +
        "Must contain .sf/config.json with authenticated org configuration. " +
        "Example: /Users/username/sfdx-projects/my-project"),
    targetOrg: z
        .string()
        .optional()
        .describe("Target org username or alias (optional). " +
        "If not provided, uses the default org configured in the project. " +
        "Example: my-devorg or user@example.com"),
});
/**
 * Extended base parameters for tools that require only source path
 * (no org targeting needed, e.g., code generation tools)
 */
export const sourcePathOnlyParams = z.object({
    sourcePath: z
        .string()
        .describe("Absolute path to the Salesforce DX project directory. " +
        "Example: /Users/username/sfdx-projects/my-project"),
});
