import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeSfCommandInProject } from "../utils/sfCommand.js";
import { buildSfCommand } from "../shared/connection.js";
import z from "zod";

const createRecord = async (
  sourcePath: string,
  sObject: string,
  values: string,
  targetOrg?: string
) => {
  const command = buildSfCommand(
    `sf data create record --sobject ${sObject} --values "${values}"`,
    targetOrg,
    sourcePath
  );

  try {
    const result = await executeSfCommandInProject(command, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

const updateRecord = async (
  sourcePath: string,
  sObject: string,
  recordId: string,
  values: string,
  targetOrg?: string
) => {
  const command = buildSfCommand(
    `sf data update record --sobject ${sObject} --record-id ${recordId} --values "${values}"`,
    targetOrg,
    sourcePath
  );

  try {
    const result = await executeSfCommandInProject(command, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

const deleteRecord = async (
  sourcePath: string,
  sObject: string,
  recordId: string,
  targetOrg?: string
) => {
  const command = buildSfCommand(
    `sf data delete record --sobject ${sObject} --record-id ${recordId}`,
    targetOrg,
    sourcePath
  );

  try {
    const result = await executeSfCommandInProject(command, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

const getRecord = async (
  sourcePath: string,
  sObject: string,
  recordId: string,
  targetOrg?: string
) => {
  const command = buildSfCommand(
    `sf data get record --sobject ${sObject} --record-id ${recordId}`,
    targetOrg,
    sourcePath
  );

  try {
    const result = await executeSfCommandInProject(command, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

const upsertRecord = async (
  sourcePath: string,
  sObject: string,
  externalIdField: string,
  externalIdValue: string,
  values: string,
  targetOrg?: string
) => {
  const command = buildSfCommand(
    `sf data upsert record --sobject ${sObject} --external-id ${externalIdField}:${externalIdValue} --values "${values}"`,
    targetOrg,
    sourcePath
  );

  try {
    const result = await executeSfCommandInProject(command, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

export const registerRecordTools = (server: McpServer) => {
  server.tool(
    "create_record",
    "Create a new record in a Salesforce org from a project using the SF CLI. Returns the ID of the created record on success.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        sObject: z
          .string()
          .describe(
            "API name of the Salesforce object to create a record for (e.g., 'Account', 'Contact', 'CustomObject__c'). Execute the sobject_list tool first to get the correct API name."
          ),
        values: z
          .string()
          .describe(
            'Field values for the new record in the format Field=Value, space-separated. Example: "Name=Acme Type=Customer". Execute the sobject_describe tool first to get the correct field API names.'
          ),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target org username or alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, sObject, values, targetOrg } = input;

      const result = await createRecord(sourcePath, sObject, values, targetOrg);
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
    "update_record",
    "Update an existing record in a Salesforce org from a project using the SF CLI. Updates specified fields on the record.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        sObject: z
          .string()
          .describe(
            "API name of the Salesforce object (e.g., 'Account', 'Contact', 'CustomObject__c'). Execute the sobject_list tool first to get the correct API name."
          ),
        recordId: z
          .string()
          .describe("Salesforce record ID to update (15 or 18 character ID)"),
        values: z
          .string()
          .describe(
            "Field values to update in the format Field=Value, space-separated. Example: \"BillingCity='San Francisco' Phone='(555) 123-4567'\". Execute the sobject_describe tool first to get the correct field API names. Only include fields you want to update."
          ),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target org username or alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, sObject, recordId, values, targetOrg } = input;

      const result = await updateRecord(
        sourcePath,
        sObject,
        recordId,
        values,
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

  server.tool(
    "delete_record",
    "Delete a record from a Salesforce org from a project using the SF CLI. Permanently removes the specified record.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        sObject: z
          .string()
          .describe(
            "API name of the Salesforce object (e.g., 'Account', 'Contact', 'CustomObject__c'). Execute the sobject_list tool first to get the correct API name."
          ),
        recordId: z
          .string()
          .describe("Salesforce record ID to delete (15 or 18 character ID)"),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target org username or alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, sObject, recordId, targetOrg } = input;

      const result = await deleteRecord(
        sourcePath,
        sObject,
        recordId,
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

  server.tool(
    "get_record",
    "Get a record from a Salesforce org from a project using the SF CLI. Retrieves all field values for the specified record.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        sObject: z
          .string()
          .describe(
            "API name of the Salesforce object (e.g., 'Account', 'Contact', 'CustomObject__c'). Execute the sobject_list tool first to get the correct API name."
          ),
        recordId: z
          .string()
          .describe("Salesforce record ID to retrieve (15 or 18 character ID)"),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target org username or alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, sObject, recordId, targetOrg } = input;

      const result = await getRecord(sourcePath, sObject, recordId, targetOrg);
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
    "upsert_record",
    "Upsert (insert or update) a record in a Salesforce org from a project using the SF CLI. Creates a new record if it doesn't exist, or updates if it does based on an external ID field.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        sObject: z
          .string()
          .describe(
            "API name of the Salesforce object (e.g., 'Account', 'Contact', 'CustomObject__c'). Execute the sobject_list tool first to get the correct API name."
          ),
        externalIdField: z
          .string()
          .describe(
            "API name of the external ID field to use for matching (e.g., 'ExternalId__c'). Execute the sobject_describe tool to see which fields are marked as external IDs."
          ),
        externalIdValue: z
          .string()
          .describe("Value of the external ID field to match against"),
        values: z
          .string()
          .describe(
            'Field values for the record in the format Field=Value, space-separated. Example: "Name=Acme Type=Customer". Execute the sobject_describe tool first to get the correct field API names.'
          ),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target org username or alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const {
        sourcePath,
        sObject,
        externalIdField,
        externalIdValue,
        values,
        targetOrg,
      } = input;

      const result = await upsertRecord(
        sourcePath,
        sObject,
        externalIdField,
        externalIdValue,
        values,
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
