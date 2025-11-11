import { AuthInfo, Connection } from "@salesforce/core";
import { getDefaultUsername } from "../utils/sfCommand.js";
/**
 * List all authenticated Salesforce orgs from the CLI
 * @returns Array of org authorization information
 */
export async function listAllOrgs() {
    try {
        const allAuthorizations = await AuthInfo.listAllAuthorizations();
        return await Promise.all(allAuthorizations.map(async (auth) => {
            try {
                const authInfo = await AuthInfo.create({
                    username: auth.username,
                });
                const connection = await Connection.create({ authInfo });
                return {
                    username: auth.username,
                    aliases: auth.aliases || undefined,
                    targetOrg: auth.aliases && auth.aliases.length > 0
                        ? auth.aliases[0]
                        : undefined,
                    orgId: auth.orgId,
                    instanceUrl: auth.instanceUrl,
                    isDevHub: auth.isDevHub,
                    apiVersion: connection.version,
                };
            }
            catch {
                return {
                    username: auth.username,
                    aliases: auth.aliases || undefined,
                    orgId: auth.orgId,
                    instanceUrl: auth.instanceUrl,
                    isDevHub: auth.isDevHub,
                };
            }
        }));
    }
    catch (error) {
        if (error.name === "NoAuthInfoFound") {
            return [];
        }
        throw error;
    }
}
/**
 * Check if an org is authenticated
 * @param targetOrg - The username or alias to check
 * @returns true if the org is authenticated, false otherwise
 */
export async function isOrgAuthenticated(targetOrg) {
    try {
        const allOrgs = await listAllOrgs();
        return allOrgs.some((org) => org.username === targetOrg ||
            (org.aliases && org.aliases.includes(targetOrg)));
    }
    catch {
        return false;
    }
}
/**
 * Get org information by username or alias
 * @param targetOrg - The username or alias of the org
 * @returns Org authorization information or null if not found
 */
export async function getOrgInfo(targetOrg) {
    try {
        const allOrgs = await listAllOrgs();
        return (allOrgs.find((org) => org.username === targetOrg ||
            (org.aliases && org.aliases.includes(targetOrg))) || null);
    }
    catch {
        return null;
    }
}
/**
 * Get the access token for a Salesforce org
 * @param targetOrg - The username or alias of the org
 * @returns The access token string
 * @throws Error if org is not authenticated
 */
export async function getOrgAccessToken(targetOrg) {
    try {
        const allAuthorizations = await AuthInfo.listAllAuthorizations();
        const foundOrg = allAuthorizations.find((auth) => auth.username === targetOrg ||
            (auth.aliases && auth.aliases.includes(targetOrg)));
        if (!foundOrg) {
            throw new Error(`No authenticated org found for '${targetOrg}'. ` +
                `Please run 'sf org login' or 'sf org create' first.`);
        }
        const authInfo = await AuthInfo.create({ username: foundOrg.username });
        const connection = await Connection.create({ authInfo });
        return connection.accessToken || "";
    }
    catch (error) {
        if (error.name === "NoAuthInfoFound") {
            throw new Error('No authenticated orgs found. Please run "sf org login" to authenticate.');
        }
        throw error;
    }
}
/**
 * Build an sf CLI command with optional target org parameter
 * @param baseCommand - The base sf command (e.g., "sf data query")
 * @param targetOrg - Optional target org username or alias
 * @param sourcePath - Optional project path to read default username from if targetOrg not provided
 * @returns Complete command string ready for execution
 */
export function buildSfCommand(baseCommand, targetOrg, sourcePath) {
    let command = baseCommand;
    let orgToUse = targetOrg;
    // If no targetOrg is provided but sourcePath is, try to get default username from config
    if ((!orgToUse || !orgToUse.trim()) && sourcePath) {
        orgToUse = getDefaultUsername(sourcePath);
    }
    // Add target org flag if we have an org to use
    if (orgToUse && orgToUse.trim()) {
        command += ` --target-org ${orgToUse}`;
    }
    // Add --json flag if not already present
    if (!command.includes("--json")) {
        command += " --json";
    }
    return command;
}
