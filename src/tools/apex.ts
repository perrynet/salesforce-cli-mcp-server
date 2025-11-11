import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildSfCommand } from "../shared/connection.js";
import {
  executeSfCommand,
  executeSfCommandRaw,
  executeSfCommandInProject,
} from "../utils/sfCommand.js";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const executeAnonymousApex = async (
  sourcePath: string,
  code: string,
  targetOrg?: string
): Promise<any> => {
  if (!code || code.trim() === "") {
    throw new Error("Code cannot be empty");
  }

  // Create a temporary file for the Apex code
  const tempFileName = `temp_apex_${Date.now()}.apex`;
  const tempFilePath = join(sourcePath, tempFileName);

  try {
    // Write the code to a temporary file
    writeFileSync(tempFilePath, code, "utf-8");

    // Use the CLI command with --file instead of --code
    const sfCommand = buildSfCommand(
      `sf apex run --file "${tempFileName}"`,
      targetOrg,
      sourcePath
    );

    const result = await executeSfCommandInProject(sfCommand, sourcePath);

    // Clean up the temporary file
    try {
      unlinkSync(tempFilePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    // Return the full result - it may contain success data or error details
    // The SF CLI returns error information in JSON format even when compilation fails
    return result;
  } catch (error: any) {
    // Clean up the temporary file in case of error
    try {
      unlinkSync(tempFilePath);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    if (error.message?.includes("No authenticated org found")) {
      throw new Error(
        `No authenticated org found${
          targetOrg ? ` for '${targetOrg}'` : ""
        }. ` + `Please run 'sf org login' to authenticate.`
      );
    }

    if (error.message?.includes("expired access/refresh token")) {
      throw new Error(
        `Authentication expired${
          targetOrg ? ` for org '${targetOrg}'` : ""
        }. ` +
          `Please run 'sf org login${
            targetOrg ? ` --alias ${targetOrg}` : ""
          }' to re-authenticate.`
      );
    }

    throw new Error(`Failed to execute Apex: ${error.message}`);
  }
};

const runApexTests = async (
  sourcePath: string,
  testLevel: string,
  targetOrg?: string,
  classNames?: string,
  testSuites?: string,
  tests?: string,
  codeCoverage: boolean = true,
  outputFormat: string = "json",
  synchronous: boolean = false
): Promise<any> => {
  try {
    let sfCommand = `sf apex run test --test-level ${testLevel}`;

    if (classNames) {
      sfCommand += ` --class-names ${classNames}`;
    }

    if (testSuites) {
      sfCommand += ` --suite-names ${testSuites}`;
    }

    if (tests) {
      sfCommand += ` --tests ${tests}`;
    }

    if (codeCoverage) {
      sfCommand += ` --code-coverage`;
    }

    if (outputFormat) {
      sfCommand += ` --result-format ${outputFormat}`;
    }

    if (synchronous) {
      sfCommand += ` --synchronous`;
    }

    const command = buildSfCommand(sfCommand, targetOrg, sourcePath);
    const result = await executeSfCommandInProject(command, sourcePath);

    return result.result;
  } catch (error: any) {
    if (error.message?.includes("No authenticated org found")) {
      throw new Error(
        `No authenticated org found${
          targetOrg ? ` for '${targetOrg}'` : ""
        }. ` + `Please run 'sf org login' to authenticate.`
      );
    }
    throw new Error(`Failed to run Apex tests: ${error.message}`);
  }
};

const getTestResults = async (
  sourcePath: string,
  testRunId: string,
  targetOrg?: string,
  codeCoverage: boolean = true
): Promise<any> => {
  try {
    let sfCommand = `sf apex get test --test-run-id ${testRunId}`;

    if (codeCoverage) {
      sfCommand += ` --code-coverage`;
    }

    const command = buildSfCommand(sfCommand, targetOrg, sourcePath);
    const result = await executeSfCommandInProject(command, sourcePath);

    return result.result;
  } catch (error: any) {
    if (error.message?.includes("No authenticated org found")) {
      throw new Error(
        `No authenticated org found${
          targetOrg ? ` for '${targetOrg}'` : ""
        }. ` + `Please run 'sf org login' to authenticate.`
      );
    }
    throw new Error(`Failed to get test results: ${error.message}`);
  }
};

const getCodeCoverage = async (
  sourcePath: string,
  type: "org-wide" | "from-tests" = "org-wide",
  targetOrg?: string,
  testRunId?: string
): Promise<any> => {
  try {
    if (type === "from-tests") {
      if (!testRunId) {
        throw new Error(
          "Test run ID is required for coverage from test results"
        );
      }

      // Get test results with code coverage
      const sfCommand = buildSfCommand(
        `sf apex get test --test-run-id ${testRunId} --code-coverage`,
        targetOrg,
        sourcePath
      );
      const result = await executeSfCommandInProject(sfCommand, sourcePath);

      if (result.result && result.result.coverage) {
        const coverage = result.result.coverage;
        const totalLines = coverage.summary?.totalLines || 0;
        const coveredLines = coverage.summary?.coveredLines || 0;
        const percentage = coverage.summary?.testRunCoverage || "0%";

        return {
          summary: {
            totalLines,
            coveredLines,
            coveragePercentage: percentage,
          },
          coverage: coverage.coverage || [],
        };
      } else {
        return {
          message: "No code coverage data available for this test run",
        };
      }
    } else {
      // Query org-wide coverage using CLI
      const query = "SELECT PercentCovered FROM ApexOrgWideCoverage";
      const sfCommand = buildSfCommand(
        `sf data query --query "${query}"`,
        targetOrg,
        sourcePath
      );
      const result = await executeSfCommandInProject(sfCommand, sourcePath);

      if (
        result.result &&
        result.result.records &&
        result.result.records.length > 0
      ) {
        const coverage = result.result.records[0].PercentCovered;
        return {
          orgWideCoverage: `${coverage}%`,
          message: `Organization-wide code coverage is ${coverage}%`,
        };
      } else {
        return { message: "Unable to retrieve org-wide coverage" };
      }
    }
  } catch (error: any) {
    if (error.name === "NoAuthInfoFound") {
      throw new Error(
        `No authenticated org found${
          targetOrg ? ` for '${targetOrg}'` : ""
        }. ` + `Please run 'sf org login' to authenticate.`
      );
    }
    throw new Error(`Failed to get code coverage: ${error.message}`);
  }
};

const generateClass = async (
  sourcePath: string,
  name: string,
  outputDir: string
) => {
  let sfCommand = `sf apex generate class --name ${name} --json `;

  if (outputDir && outputDir.length > 0) {
    sfCommand += `--output-dir ${outputDir}`;
  }

  try {
    const result = await executeSfCommandInProject(sfCommand, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

const generateTrigger = async (
  sourcePath: string,
  name: string,
  sObjectName: string,
  outputDir: string
) => {
  let sfCommand = `sf apex generate trigger --name ${name} --json `;

  if (sObjectName && sObjectName.length > 0) {
    sfCommand += `--sobject ${sObjectName} `;
  }

  if (outputDir && outputDir.length > 0) {
    sfCommand += `--output-dir ${outputDir}`;
  }

  try {
    const result = await executeSfCommandInProject(sfCommand, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

const apexLogList = async (
  sourcePath: string,
  targetOrg?: string,
  username?: string,
  limit?: number
) => {
  const command = buildSfCommand(`sf apex log list`, targetOrg, sourcePath);

  try {
    const result = await executeSfCommandInProject(command, sourcePath);

    if (
      (username || limit) &&
      result?.status === 0 &&
      Array.isArray(result?.result)
    ) {
      const subset = result.result.filter((log: any) =>
        log.LogUser?.Name?.includes(username || "")
      );
      return limit ? subset.slice(0, limit) : subset;
    }

    return result;
  } catch (error) {
    throw error;
  }
};

const apexGetLog = async (
  sourcePath: string,
  logId: string,
  recentLogsNumber: number,
  targetOrg?: string
) => {
  let sfCommand = buildSfCommand(`sf apex get log`, targetOrg, sourcePath);

  const hasLogId = logId && logId.length > 0;

  if (hasLogId) {
    sfCommand += ` --log-id ${logId}`;
  }

  if (!hasLogId && recentLogsNumber !== 0) {
    sfCommand += ` --number ${recentLogsNumber}`;
  }

  try {
    const result = await executeSfCommandInProject(sfCommand, sourcePath);
    return result;
  } catch (error) {
    throw error;
  }
};

export const registerApexTools = (server: McpServer) => {
  server.tool(
    "execute_anonymous_apex",
    "Execute Apex code in a Salesforce Org from a project. This command allows you to run Apex code directly against a specified Salesforce Org. The code is executed in the context of the Org, and the results are returned in JSON format. You can use this command to test Apex code snippets, run batch jobs, or perform other Apex-related tasks. You can review the debug logs of the execution to see the results of the code execution.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        code: z
          .string()
          .describe("Apex code to execute")
          .min(1, "Code cannot be empty"),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target Salesforce Org Alias (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, code, targetOrg } = input;

      const result = await executeAnonymousApex(sourcePath, code, targetOrg);
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
    "run_apex_tests",
    "Run Apex tests in a Salesforce Org from a project. This command allows you to execute unit tests with various options including test level, specific classes, suites, and code coverage collection. Tests can be run synchronously or asynchronously. Use this to validate your Apex code and ensure proper test coverage.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        testLevel: z
          .enum(["RunLocalTests", "RunAllTestsInOrg", "RunSpecifiedTests"])
          .describe(
            "Test level - RunLocalTests (all except managed packages), RunAllTestsInOrg (all tests), or RunSpecifiedTests (specific tests only)"
          )
          .default("RunLocalTests"),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target Salesforce Org Alias (optional - uses default org from project if not provided)"
          ),
        classNames: z
          .string()
          .optional()
          .describe(
            "Apex test class names to run; default is all classes. If you select --class-names, you can't specify --suite-names or --tests. For multiple classes, repeat the flag for each: --class-names Class1 --class-names Class2."
          ),
        testSuites: z
          .string()
          .optional()
          .describe(
            "Apex test suite names to run. If you select --suite-names, you can't specify --class-names or --tests. For multiple suites, repeat the flag for each: --suite-names Class1 --suite-names Class2."
          ),
        tests: z
          .string()
          .optional()
          .describe(
            "Apex test class names or IDs and, if applicable, test methods to run; default is all tests. If you specify --tests, you can't specify --class-names or --suite-names. For multiple tests, repeat the flag for each: --tests Test1 --tests Test2."
          ),
        codeCoverage: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to collect code coverage information"),
        synchronous: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            "Whether to run tests synchronously (wait for completion) or asynchronously"
          ),
      }),
    },
    async ({ input }) => {
      const result = await runApexTests(
        input.sourcePath,
        input.testLevel,
        input.targetOrg,
        input.classNames,
        input.testSuites,
        input.tests,
        input.codeCoverage,
        "json",
        input.synchronous
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
    "get_apex_test_results",
    "Retrieve results from a previous asynchronous Apex test run from a project. Use this command with a test run ID to get detailed test results including pass/fail status, error messages, stack traces, and optionally code coverage information.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        testRunId: z
          .string()
          .describe(
            "The test run ID returned from a previous asynchronous test execution"
          ),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target Salesforce Org Alias where the tests were run (optional - uses default org from project if not provided)"
          ),
        codeCoverage: z
          .boolean()
          .optional()
          .default(true)
          .describe(
            "Whether to include code coverage information in the results"
          ),
      }),
    },
    async ({ input }) => {
      const result = await getTestResults(
        input.sourcePath,
        input.testRunId,
        input.targetOrg,
        input.codeCoverage
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
    "get_apex_code_coverage",
    "Get code coverage information for a Salesforce Org from a project. This command allows you to retrieve org-wide coverage percentage or coverage details from a specific test run. Use this to monitor and ensure your code meets the 75% coverage requirement.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        coverageType: z
          .enum(["org-wide", "from-tests"])
          .default("org-wide")
          .describe(
            "Type of coverage to retrieve: org-wide (overall org percentage) or from-tests (coverage from a specific test run)"
          ),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Target Salesforce Org Alias to get coverage from (optional - uses default org from project if not provided)"
          ),
        testRunId: z
          .string()
          .optional()
          .describe("Test run ID (required when coverageType is 'from-tests')"),
      }),
    },
    async ({ input }) => {
      const result = await getCodeCoverage(
        input.sourcePath,
        input.coverageType as "org-wide" | "from-tests",
        input.targetOrg,
        input.testRunId
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
    "generate_class",
    'Generates the Apex *.cls file and associated metadata file in a project. These files must be contained in a parent directory called "classes" in your package directory. Either run this command from an existing directory of this name, or use the --output-dir flag to generate one or point to an existing one.',
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        name: z
          .string()
          .describe(
            "Name of the generated Apex class. The name can be up to 40 characters and must start with a letter."
          ),
        outputDir: z
          .string()
          .optional()
          .describe(
            "Directory for saving the created files. The location can be an absolute path or relative to the current working directory. The default is the current directory."
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, name, outputDir } = input;

      const result = await generateClass(sourcePath, name, outputDir || "");
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
    "generate_trigger",
    'Generates the Apex trigger *.trigger file and associated metadata file in a project. These files must be contained in a parent directory called "triggers" in your package directory. Either run this command from an existing directory of this name, or use the --output-dir flag to generate one or point to an existing one. If you don\'t specify the --sobject flag, the .trigger file contains the generic placeholder SOBJECT; replace it with the Salesforce object you want to generate a trigger for. If you don\'t specify --event, "before insert" is used.',
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        name: z
          .string()
          .describe(
            "Name of the generated Apex trigger. The name can be up to 40 characters and must start with a letter."
          ),
        sObjectName: z
          .string()
          .optional()
          .describe("Salesforce object to generate a trigger on."),
        outputDir: z
          .string()
          .optional()
          .describe(
            "Directory for saving the created files. The location can be an absolute path or relative to the current working directory. The default is the current directory."
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, name, sObjectName, outputDir } = input;

      const result = await generateTrigger(
        sourcePath,
        name,
        sObjectName || "",
        outputDir || ""
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
    "apex_log_list",
    "Fetch the list of apex debug logs from a project, returning the logs with their IDs.",
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
            "Username or alias of the target org (optional - uses default org from project if not provided)"
          ),
        username: z
          .string()
          .optional()
          .describe(
            "Filter logs by the username of the user who generated the log (optional)"
          ),
        limit: z
          .number()
          .optional()
          .describe(
            "Maximum number of logs to return. When combined with username filter, returns up to this many logs from the filtered user (optional)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, targetOrg, username, limit } = input;

      const result = await apexLogList(sourcePath, targetOrg, username, limit);
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
    "apex_get_log",
    "Fetch the specified log or given number of most recent logs from a project's org.",
    {
      input: z.object({
        sourcePath: z
          .string()
          .describe(
            "Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"
          ),
        logId: z
          .string()
          .optional()
          .describe(
            "ID of the specific log to display. Execute the apex_log_list tool before to get the ids."
          ),
        recentLogsNumber: z
          .number()
          .optional()
          .describe("Number of the most recent logs to display."),
        targetOrg: z
          .string()
          .optional()
          .describe(
            "Username or alias of the target org (optional - uses default org from project if not provided)"
          ),
      }),
    },
    async ({ input }) => {
      const { sourcePath, logId, recentLogsNumber, targetOrg } = input;

      const result = await apexGetLog(
        sourcePath,
        logId || "",
        recentLogsNumber || 0,
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
