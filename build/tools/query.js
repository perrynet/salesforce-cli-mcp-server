import { z } from "zod";
import { executeSfCommandInProject, } from "../utils/sfCommand.js";
import { buildSfCommand } from "../shared/connection.js";
const executeSoqlQuery = async (sourcePath, sObject, selectClause, targetOrg, where, limit, orderBy) => {
    let query = `SELECT ${selectClause} FROM ${sObject}`;
    if (where)
        query += " WHERE " + where;
    if (orderBy)
        query += " ORDER BY " + orderBy;
    if (limit)
        query += " LIMIT " + limit;
    const sfCommand = buildSfCommand(`sf data query --query "${query}"`, targetOrg, sourcePath);
    try {
        const result = await executeSfCommandInProject(sfCommand, sourcePath);
        return result.result.records || [];
    }
    catch (error) {
        throw error;
    }
};
const executeSoqlQueryToFile = async (sourcePath, sObject, selectClause, targetOrg, where, outputFileName, outputFileFormat = "csv", orderBy) => {
    let query = `SELECT ${selectClause} FROM ${sObject}`;
    if (where)
        query += " WHERE " + where;
    if (orderBy)
        query += " ORDER BY " + orderBy;
    const sfCommand = buildSfCommand(`sf data export bulk --query "${query}" --output-file "${outputFileName || "output"}" --result-format ${outputFileFormat} -w 30`, targetOrg, sourcePath);
    try {
        const result = await executeSfCommandInProject(sfCommand, sourcePath);
        return result.result;
    }
    catch (error) {
        throw error;
    }
};
const executeSoqlQueryRaw = async (sourcePath, query, targetOrg) => {
    if (!query || query.trim() === "") {
        throw new Error("Query cannot be empty");
    }
    const sfCommand = buildSfCommand(`sf data query --query "${query}"`, targetOrg, sourcePath);
    try {
        const result = await executeSfCommandInProject(sfCommand, sourcePath);
        return result.result.records || [];
    }
    catch (error) {
        throw error;
    }
};
const executeSoqlQueryToolingApi = async (sourcePath, query, targetOrg) => {
    if (!query || query.trim() === "") {
        throw new Error("Query cannot be empty");
    }
    const sfCommand = buildSfCommand(`sf tooling query --query "${query}"`, targetOrg, sourcePath);
    try {
        const result = await executeSfCommandInProject(sfCommand, sourcePath);
        return result.result.records || [];
    }
    catch (error) {
        throw error;
    }
};
export const registerQueryTools = (server) => {
    server.tool("query_records", "Query records from a SINGLE Salesforce object from a project using structured field conditions. Use this for precise queries on ONE object with specific field criteria (e.g., Status = 'Open', Amount > 1000). NOT for text searches across multiple objects - use search_records for that. This executes SOQL queries with SELECT, WHERE, ORDER BY, and LIMIT clauses on a single SObject. The results are returned in JSON format. IMPORTANT: Always execute the `sobject_list` tool first to understand which objects are available in the org, and optionally execute `sobject_describe` for the specific SObject to understand its fields and structure before querying.", {
        input: z.object({
            sourcePath: z
                .string()
                .describe("Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"),
            sObject: z.string().describe("Salesforce SObject to query from"),
            selectClause: z
                .string()
                .describe("SELECT clause content - can include fields, functions (COUNT, SUM, AVG, etc.), expressions, and aliases"),
            targetOrg: z
                .string()
                .optional()
                .describe("Target Salesforce Org to execute the query against (optional - uses default org from project if not provided)"),
            where: z
                .string()
                .optional()
                .describe("Optional WHERE clause for the query"),
            limit: z
                .number()
                .optional()
                .describe("Optional limit for the number of records returned"),
            orderBy: z
                .string()
                .optional()
                .describe("Optional ORDER BY clause for sorting results (e.g., 'Name ASC', 'CreatedDate DESC')"),
        }),
    }, async ({ input }) => {
        const { sourcePath, sObject, selectClause, targetOrg, where, limit, orderBy, } = input;
        const result = await executeSoqlQuery(sourcePath, sObject, selectClause, targetOrg, where, limit, orderBy);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result),
                },
            ],
        };
    });
    server.tool("query_records_to_file", "Query records from a Salesforce SObject from a project and save to a file. This command allows you to execute a SOQL query against a specified Salesforce SObject in a given Org and save the results to a file. You can specify the SELECT clause (fields, functions like COUNT(), aggregations, etc.), an optional WHERE clause, and save the results in various formats. The results can be saved in CSV format by default, or in other formats if specified. IMPORTANT: Always execute the `sobject_list` tool first to understand which objects are available in the org, and optionally execute `sobject_describe` for the specific SObject to understand its fields and structure before querying.", {
        input: z.object({
            sourcePath: z
                .string()
                .describe("Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"),
            sObject: z.string().describe("Salesforce SObject to query from"),
            selectClause: z
                .string()
                .describe("SELECT clause content - can include fields, functions (COUNT, SUM, AVG, etc.), expressions, and aliases"),
            targetOrg: z
                .string()
                .optional()
                .describe("Target Salesforce Org to execute the query against (optional - uses default org from project if not provided)"),
            where: z
                .string()
                .optional()
                .describe("Optional WHERE clause for the query"),
            outputFileName: z
                .string()
                .optional()
                .describe("Optional output file name to save the results"),
            outputFileFormat: z
                .enum(["csv", "json"])
                .optional()
                .default("csv")
                .describe("Optional output file format to save the results, default is csv"),
            orderBy: z
                .string()
                .optional()
                .describe("Optional ORDER BY clause for sorting results (e.g., 'Name ASC', 'CreatedDate DESC')"),
        }),
    }, async ({ input }) => {
        const { sourcePath, sObject, selectClause, targetOrg, where, outputFileName, outputFileFormat, orderBy, } = input;
        const result = await executeSoqlQueryToFile(sourcePath, sObject, selectClause, targetOrg, where, outputFileName, outputFileFormat, orderBy);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result),
                },
            ],
        };
    });
    server.tool("execute_soql_query", "Execute a raw SOQL query against a Salesforce Org from a project. This command allows you to execute any SOQL query with complete control over the query structure. The query is executed using the Data Cloud API and results are returned in JSON format. Use this for complex queries, subqueries, aggregations, or any SOQL that cannot be constructed with the structured query_records tool. The query will be executed exactly as provided, so ensure proper SOQL syntax.", {
        input: z.object({
            sourcePath: z
                .string()
                .describe("Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"),
            query: z
                .string()
                .describe("Raw SOQL query string to execute (e.g., 'SELECT Id, Name FROM Account WHERE Type = \"Customer\" ORDER BY Name ASC')")
                .min(1, "Query cannot be empty"),
            targetOrg: z
                .string()
                .optional()
                .describe("Target Salesforce Org to execute the query against (optional - uses default org from project if not provided)"),
        }),
    }, async ({ input }) => {
        const { sourcePath, query, targetOrg } = input;
        const result = await executeSoqlQueryRaw(sourcePath, query, targetOrg);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result),
                },
            ],
        };
    });
    server.tool("execute_soql_query_tooling_api", "Execute a SOQL query against the Salesforce Tooling API from a project. This command allows you to query Salesforce metadata objects such as ApexClass, ApexTrigger, CustomField, CustomObject, ApexPage, and other metadata types. The query is executed using the Tooling API and results are returned in JSON format. Use this to retrieve metadata information about your Salesforce configuration. Ensure your query targets valid Tooling API objects and that you have the necessary permissions to access the metadata.", {
        input: z.object({
            sourcePath: z
                .string()
                .describe("Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"),
            query: z
                .string()
                .describe("Raw Tooling API SOQL query string to execute (e.g., 'SELECT Id, Name, Body FROM ApexClass WHERE Name LIKE \"MyClass%\"')")
                .min(1, "Query cannot be empty"),
            targetOrg: z
                .string()
                .optional()
                .describe("Target Salesforce Org to execute the query against (optional - uses default org from project if not provided)"),
        }),
    }, async ({ input }) => {
        const { sourcePath, query, targetOrg } = input;
        const result = await executeSoqlQueryToolingApi(sourcePath, query, targetOrg);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result),
                },
            ],
        };
    });
};
