import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeSfCommandInProject } from "../utils/sfCommand.js";
import z from "zod";

const schemaGenerateTabInputSchema = z.object({
    sourcePath: z
        .string()
        .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
        ),
    object: z
        .string()
        .describe("API name of the custom object (e.g., MyObject__c)"),
    directory: z
        .string()
        .describe(
            "Path to a 'tabs' directory that will contain the source files"
        ),
    icon: z
        .number()
        .min(1)
        .max(100)
        .default(1)
        .describe(
            "Number from 1 to 100 that specifies the color scheme and icon for the custom tab"
        ),
});

const schemaGenerateTab = async (
    input: z.infer<typeof schemaGenerateTabInputSchema>
) => {
    const { sourcePath, object, directory, icon } = input;

    try {
        let sfCommand = `sf schema generate tab --object "${object}" --directory "${directory}" --icon ${icon}`;

        const result = await executeSfCommandInProject(sfCommand, sourcePath);
        return { result };
    } catch (error: any) {
        return {
            error: error.message || "Failed to generate tab",
        };
    }
};

export const registerSchemaTools = (server: McpServer) => {
    server.tool(
        "schema_generate_tab",
        "Generate metadata source files for a new custom tab on a custom object from a project. Custom tabs display custom object data in Salesforce navigation.",
        {
            input: schemaGenerateTabInputSchema,
        },
        async ({ input }) => {
            const result = await schemaGenerateTab(input);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );
};
