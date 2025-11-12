import { exec } from "node:child_process";
import { platform } from "node:os";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

let cachedSfPath: string | null = null;

const COMMON_SF_PATHS = {
  darwin: [
    "/usr/local/bin/sf",
    "/opt/homebrew/bin/sf",
    "/usr/bin/sf",
    process.env.HOME + "/.local/bin/sf",
  ],
  linux: [
    "/usr/local/bin/sf",
    "/usr/bin/sf",
    "/opt/salesforce/cli/bin/sf",
    process.env.HOME + "/.local/bin/sf",
  ],
  win32: [
    "C:\\Program Files\\sf\\bin\\sf.cmd",
    "C:\\Program Files\\sf\\bin\\sf.exe",
    "C:\\Program Files (x86)\\sf\\bin\\sf.cmd",
    "C:\\Program Files (x86)\\sf\\bin\\sf.exe",
    process.env.LOCALAPPDATA + "\\sf\\bin\\sf.cmd",
    process.env.LOCALAPPDATA + "\\sf\\bin\\sf.exe",
  ],
};

function findSfPath(): string {
  if (cachedSfPath) {
    return cachedSfPath;
  }

  const currentPlatform = platform();
  const pathsToCheck =
    COMMON_SF_PATHS[currentPlatform as keyof typeof COMMON_SF_PATHS] ||
    COMMON_SF_PATHS.linux;

  for (const path of pathsToCheck) {
    if (path && existsSync(path)) {
      cachedSfPath = path;
      return path;
    }
  }

  cachedSfPath = "sf";
  return "sf";
}

export function executeSfCommand(command: string): Promise<any> {
  const sfPath = findSfPath();
  const fullCommand = command.replace(/^sf\s+/, `"${sfPath}" `);

  return new Promise((resolve, reject) => {
    exec(
      fullCommand,
      { maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        // Try to parse JSON output first, even if there's an error
        // SF CLI returns JSON error details in stdout when --json flag is used
        if (stdout) {
          try {
            const result = JSON.parse(stdout);
            // If we successfully parsed JSON, resolve with it even if there was an error
            // The error details are in the JSON result
            resolve(result);
            return;
          } catch (parseError) {
            // If JSON parsing fails, continue with error handling
          }
        }

        if (error) {
          if (
            error.message.includes("command not found") ||
            error.message.includes("is not recognized")
          ) {
            reject(
              new Error(
                "Salesforce CLI (sf) not found. Please ensure it is installed and accessible. " +
                  "Visit https://developer.salesforce.com/tools/salesforcecli for installation instructions."
              )
            );
            return;
          }

          // Attempt to parse JSON error details from stderr
          try {
            const errorDetails = JSON.parse(stderr);
            const detailedMessage =
              `Error: ${errorDetails.message}\n` +
              (errorDetails.actions
                ? `Actions: ${errorDetails.actions.join("\n")}\n`
                : "") +
              (errorDetails.stack ? `Stack: ${errorDetails.stack}` : "");
            reject(new Error(detailedMessage));
          } catch (parseError) {
            // If parsing fails, reject with the original error
            reject(error);
          }
          return;
        }

        if (stderr && !stderr.includes("Warning")) {
          // Attempt to parse JSON error details from stderr
          try {
            const errorDetails = JSON.parse(stderr);
            const detailedMessage =
              `Error: ${errorDetails.message}\n` +
              (errorDetails.actions
                ? `Actions: ${errorDetails.actions.join("\n")}\n`
                : "") +
              (errorDetails.stack ? `Stack: ${errorDetails.stack}` : "");
            reject(new Error(detailedMessage));
          } catch (parseError) {
            reject(new Error(stderr));
          }
          return;
        }

        // This shouldn't happen, but just in case
        reject(new Error("No output received from command"));
      }
    );
  });
}

export function executeSfCommandRaw(command: string): Promise<string> {
  const sfPath = findSfPath();
  const fullCommand = command.replace(/^sf\s+/, `"${sfPath}" `);

  return new Promise((resolve, reject) => {
    exec(
      fullCommand,
      { maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          if (
            error.message.includes("command not found") ||
            error.message.includes("is not recognized")
          ) {
            reject(
              new Error(
                "Salesforce CLI (sf) not found. Please ensure it is installed and accessible. " +
                  "Visit https://developer.salesforce.com/tools/salesforcecli for installation instructions."
              )
            );
          } else {
            // For scanner commands, non-zero exit code with stdout means violations were found
            // We should still return the output in this case
            if (
              stdout &&
              (command.includes("scanner") || command.includes("code-analyzer"))
            ) {
              resolve(stdout);
              return;
            }
            reject(error);
          }
          return;
        }
        // Return raw stdout without JSON parsing
        resolve(stdout);
      }
    );
  });
}

/**
 * Get the default username from the project's .sfdx/sfdx-config.json file
 * @param projectPath - Absolute path to the Salesforce DX project directory
 * @returns The default username or undefined if not found
 */
export function getDefaultUsername(projectPath: string): string | undefined {
  try {
    const resolvedPath = resolve(projectPath);
    const configPath = join(resolvedPath, ".sfdx", "sfdx-config.json");

    if (!existsSync(configPath)) {
      return undefined;
    }

    const configContent = readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);

    return config.defaultusername;
  } catch (error) {
    // Return undefined if there's any error reading or parsing the config
    return undefined;
  }
}

/**
 * Validates that a project path exists and contains a valid Salesforce DX project structure
 * @param projectPath - Absolute path to the project directory
 * @throws Error if path is invalid or doesn't contain required structure
 */
export function validateProjectPath(projectPath: string): void {
  if (!projectPath || projectPath.trim() === "") {
    throw new Error("Project path cannot be empty");
  }

  const resolvedPath = resolve(projectPath);

  // Check if path exists
  if (!existsSync(resolvedPath)) {
    throw new Error(`Project path does not exist: ${resolvedPath}`);
  }

  // Check if it's a directory
  try {
    const stats = statSync(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`Project path is not a directory: ${resolvedPath}`);
    }
  } catch (error: any) {
    throw new Error(`Cannot access project path: ${error.message}`);
  }

  // Check for .sf directory (indicates valid SFDX project with config)
  const sfConfigPath = join(resolvedPath, ".sf");
  if (!existsSync(sfConfigPath)) {
    throw new Error(
      `Project path does not contain .sf directory. ` +
        `Please ensure this is a valid Salesforce DX project: ${resolvedPath}`
    );
  }
}

/**
 * Execute a Salesforce CLI command in the context of a specific project directory
 * @param command - The sf command to execute (without 'cd' prefix)
 * @param projectPath - Absolute path to the Salesforce DX project directory
 * @returns Promise resolving to parsed JSON result
 */
export function executeSfCommandInProject(
  command: string,
  projectPath: string
): Promise<any> {
  // Validate project path first
  validateProjectPath(projectPath);

  const sfPath = findSfPath();
  const resolvedPath = resolve(projectPath);

  // Replace 'sf' at the start of the command with the full path
  const sfCommand = command.replace(/^sf\s+/, `"${sfPath}" `);

  // Build the full command with directory change
  // Use cross-platform approach: cd to directory and execute command
  const fullCommand =
    platform() === "win32"
      ? `cd /d "${resolvedPath}" && ${sfCommand}`
      : `cd "${resolvedPath}" && ${sfCommand}`;

  return new Promise((resolve, reject) => {
    exec(
      fullCommand,
      { maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        // Try to parse JSON output first, even if there's an error
        // SF CLI returns JSON error details in stdout when --json flag is used
        if (stdout) {
          try {
            const result = JSON.parse(stdout);
            // If we successfully parsed JSON, resolve with it even if there was an error
            // The error details are in the JSON result
            resolve(result);
            return;
          } catch (parseError) {
            // If JSON parsing fails, continue with error handling
          }
        }

        if (error) {
          if (
            error.message.includes("command not found") ||
            error.message.includes("is not recognized")
          ) {
            reject(
              new Error(
                "Salesforce CLI (sf) not found. Please ensure it is installed and accessible. " +
                  "Visit https://developer.salesforce.com/tools/salesforcecli for installation instructions."
              )
            );
          } else {
            reject(error);
          }
          return;
        }
        if (stderr && !stderr.includes("Warning")) {
          reject(new Error(stderr));
          return;
        }
        // This shouldn't happen, but just in case
        reject(new Error("No output received from command"));
      }
    );
  });
}

/**
 * Execute a Salesforce CLI command in project context and return raw output
 * @param command - The sf command to execute (without 'cd' prefix)
 * @param projectPath - Absolute path to the Salesforce DX project directory
 * @returns Promise resolving to raw stdout string
 */
export function executeSfCommandInProjectRaw(
  command: string,
  projectPath: string
): Promise<string> {
  // Validate project path first
  validateProjectPath(projectPath);

  const sfPath = findSfPath();
  const resolvedPath = resolve(projectPath);

  // Replace 'sf' at the start of the command with the full path
  const sfCommand = command.replace(/^sf\s+/, `"${sfPath}" `);

  // Build the full command with directory change
  const fullCommand =
    platform() === "win32"
      ? `cd /d "${resolvedPath}" && ${sfCommand}`
      : `cd "${resolvedPath}" && ${sfCommand}`;

  return new Promise((resolve, reject) => {
    exec(
      fullCommand,
      { maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          if (
            error.message.includes("command not found") ||
            error.message.includes("is not recognized")
          ) {
            reject(
              new Error(
                "Salesforce CLI (sf) not found. Please ensure it is installed and accessible. " +
                  "Visit https://developer.salesforce.com/tools/salesforcecli for installation instructions."
              )
            );
          } else {
            // For scanner commands, non-zero exit code with stdout means violations were found
            // We should still return the output in this case
            if (
              stdout &&
              (command.includes("scanner") || command.includes("code-analyzer"))
            ) {
              resolve(stdout);
              return;
            }

            // Check if stdout contains JSON error details (SF CLI with --json flag)
            if (stdout && command.includes("--json")) {
              try {
                const jsonResult = JSON.parse(stdout);
                if (jsonResult.status === 1 || jsonResult.exitCode === 1) {
                  // SF CLI returned an error in JSON format
                  const errorMessage =
                    jsonResult.message || jsonResult.name || "Command failed";
                  const actions = jsonResult.actions
                    ? `\nSuggested actions:\n${jsonResult.actions.join("\n")}`
                    : "";
                  const stack = jsonResult.stack
                    ? `\nStack trace:\n${jsonResult.stack}`
                    : "";
                  reject(new Error(`${errorMessage}${actions}${stack}`));
                  return;
                }
              } catch (parseError) {
                // If JSON parsing fails, fall through to default error handling
              }
            }

            reject(error);
          }
          return;
        }
        // Return raw stdout without JSON parsing
        resolve(stdout);
      }
    );
  });
}
