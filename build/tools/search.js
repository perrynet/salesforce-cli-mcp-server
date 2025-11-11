import { z } from "zod";
import { executeSfCommandInProjectRaw, } from "../utils/sfCommand.js";
import { buildSfCommand } from "../shared/connection.js";
const executeSoslQuery = async (sourcePath, targetOrg, query, file, resultFormat = "json") => {
    let sfCommand;
    if (query) {
        sfCommand = buildSfCommand(`sf data search --query "${query}" --result-format ${resultFormat}`, targetOrg, sourcePath);
    }
    else if (file) {
        sfCommand = buildSfCommand(`sf data search --file "${file}" --result-format ${resultFormat}`, targetOrg, sourcePath);
    }
    else {
        throw new Error("Either query or file must be provided");
    }
    try {
        const result = await executeSfCommandInProjectRaw(sfCommand, sourcePath);
        if (resultFormat === "json") {
            try {
                return JSON.parse(result);
            }
            catch (parseError) {
                return { searchRecords: [], rawOutput: result };
            }
        }
        if (resultFormat === "csv") {
            return {
                success: true,
                message: "Results written to CSV files",
                output: result,
            };
        }
        return { output: result };
    }
    catch (error) {
        throw error;
    }
};
export const registerSearchTools = (server) => {
    server.tool("search_records", "Search for text across multiple Salesforce objects simultaneously from a project. USE THIS TOOL when searching for records that mention, contain, or reference specific text (like company names, keywords, phrases) across different objects. This is the PRIMARY tool for text-based searches across your org - it's much more efficient than running multiple SOQL queries. Perfect for finding all records mentioning a competitor, customer name, or any text across Accounts, Opportunities, Cases, Contacts, etc. SOSL (Salesforce Object Search Language) performs full-text search across all searchable fields.", {
        input: z
            .object({
            sourcePath: z
                .string()
                .describe("Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"),
            query: z
                .string()
                .optional()
                .describe('SOSL query to execute (e.g., "FIND {Anna Jones} IN Name Fields RETURNING Contact (Name, Phone)")'),
            file: z
                .string()
                .optional()
                .describe("Path to file that contains the SOSL query"),
            targetOrg: z
                .string()
                .optional()
                .describe("Username or alias of the target org (optional - uses default org from project if not provided)"),
            resultFormat: z
                .enum(["human", "csv", "json"])
                .optional()
                .default("json")
                .describe("Format to display the results. 'csv' writes to disk, 'human' and 'json' display to terminal"),
        })
            .refine((data) => !!(data.query || data.file) && !(data.query && data.file), {
            message: "Provide either 'query' or 'file', but not both",
        }),
    }, async ({ input }) => {
        const { sourcePath, query, file, targetOrg, resultFormat } = input;
        try {
            const result = await executeSoslQuery(sourcePath, targetOrg, query, file, resultFormat);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: error.message || "Failed to execute SOSL search",
                        }),
                    },
                ],
            };
        }
    });
};
