import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeSfCommandInProject } from "../utils/sfCommand.js";
import { buildSfCommand } from "../shared/connection.js";

const executeSobjectList = async (sourcePath: string, targetOrg?: string) => {
  const sfCommand = buildSfCommand(
    `sf sobject list --sobject all`,
    targetOrg,
    sourcePath
  );

  try {
    const result = await executeSfCommandInProject(sfCommand, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

const executeSObjectDescribe = async (
  sourcePath: string,
  sObjectName: string,
  targetOrg?: string
) => {
  const sfCommand = buildSfCommand(
    `sf sobject describe --sobject ${sObjectName}`,
    targetOrg,
    sourcePath
  );

  try {
    const result = await executeSfCommandInProject(sfCommand, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

export const registerSObjectTools = (server: McpServer) => {
  server.tool(
    "sobject_list",
    "List all standard and custom objects in a Salesforce Org from a project. This command retrieves a list of all standard and custom objects available in the specified Salesforce Org. The results are returned in JSON format, providing details about each object, including its name, label, and other metadata. Use this command to explore the objects in your Salesforce Org and understand their structure and properties, especially if asked to work with specific objects in your Apex code or SOQL queries and you don't know their API names. Always execute this tool before writing Apex code or SOQL queries to ensure you have the correct object names.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target Salesforce Org Alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, targetOrg } = input;

      const result = await executeSobjectList(sourcePath, targetOrg);
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

  server.tool(
    "sobject_describe",
    "Describe a Salesforce SObject from a project. This command retrieves detailed metadata about a specific Salesforce SObject, including its fields, relationships, and other properties. The results are returned in JSON format, providing a comprehensive view of the SObject's structure. Use this command to understand the schema of a specific SObject, which is especially useful when writing Apex code or SOQL queries that interact with that SObject. Always execute this tool before querying or manipulating records in the SObject to ensure you have the correct field names and types.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        sObjectName: z.string().describe("Name of the SObject to describe"),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target Salesforce Org Alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, sObjectName, targetOrg } = input;

      const result = await executeSObjectDescribe(
        sourcePath,
        sObjectName,
        targetOrg
      );
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
