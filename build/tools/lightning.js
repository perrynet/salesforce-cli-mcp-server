import { z } from "zod";
import { executeSfCommandInProject } from "../utils/sfCommand.js";
const generateComponent = async (sourcePath, name, template, outputDirectory, type) => {
    let sfCommand = `sf lightning generate component --name ${name} --json `;
    if (template && template.length > 0) {
        sfCommand += `--template ${template} `;
    }
    if (outputDirectory && outputDirectory.length > 0) {
        sfCommand += `--output-dir ${outputDirectory} `;
    }
    if (type && type.length > 0) {
        sfCommand += `--type ${type}`;
    }
    try {
        const result = await executeSfCommandInProject(sfCommand, sourcePath);
        return result;
    }
    catch (error) {
        throw error;
    }
};
export const registerLightningTools = (server) => {
    server.tool("generate_component", "Generate a Lightning Component from a project", {
        input: z.object({
            sourcePath: z
                .string()
                .describe("Absolute path to the Salesforce DX project directory (must contain .sf/config.json)"),
            name: z
                .string()
                .describe("Name of the generated Lightning Component. The name can be up to 40 characters and must start with a letter."),
            template: z
                .string()
                .optional()
                .describe("Template to use for file creation. Supplied parameter values or default values are filled into a copy of the template. Permissible values are: default, analyticsDashboard, analyticsDashboardWithStep. Default value: default"),
            outputDirectory: z
                .string()
                .optional()
                .describe("Directory for saving the created files. The location can be an absolute path or relative to the current working directory. The default is the current directory. Default value: ."),
            type: z
                .string()
                .optional()
                .describe("Type of the component bundle. Permissible values are: aura, lwc (lightning web component). Default value: aura"),
        }),
    }, async ({ input }) => {
        const { sourcePath, name, template, outputDirectory, type } = input;
        const DEFAULT_OUTPUT = ".";
        const result = await generateComponent(sourcePath, name, template || "", outputDirectory || DEFAULT_OUTPUT, type || "");
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
