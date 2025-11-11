# Salesforce CLI MCP Server

[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/perrynet/salesforce-cli-mcp-server/blob/main/LICENSE)

## What is it

Salesforce CLI MCP Server v2.0 is a Model Context Protocol (MCP) server that enables AI assistants to interact with Salesforce organizations through project-based CLI integration. It provides tools that allow AI models to execute Apex code, query data, describe objects, and manage Salesforce orgs using your local Salesforce DX project configurations.

**Note**: This is a local MCP server that runs from your repository. It is not distributed via NPM.

### Installation

#### Prerequisites

- [Node.js (v18 or higher)](https://nodejs.org/en/download)
- [Salesforce CLI (`sf`) installed and configured](https://developer.salesforce.com/tools/salesforcecli)
- At least one authenticated Salesforce org
- Git (to clone this repository)

#### Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/perrynet/salesforce-cli-mcp-server.git
   cd salesforce-cli-mcp-server
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. The compiled server will be available at `build/index.js`

#### Add MCP Configuration to your client

To use this MCP Server, you need a client that supports the MCP protocol. Configure it with a command that points to the local server.

- [Claude Desktop](https://claude.ai/download)
- [Claude Code](https://www.anthropic.com/claude-code)
- [Codex CLI](https://github.com/openai/codex)
- [VS Code Copilot](https://code.visualstudio.com/docs/copilot/overview)
- [Cursor](https://cursor.com/downloads)

#### Use it with Claude Desktop

1. Install [Claude Desktop](https://claude.ai/download) from Anthropic.
2. Clone this repository and run `npm install && npm run build` (see Setup Instructions above).
3. Edit your config file at:
    - Mac: `~/Library/Application\ Support/Claude/claude_desktop_config.json`
    - Windows: `C:\\Users\\YOUR_USERNAME\\AppData\\Roaming\\Claude\\claude_desktop_config.json`

    > **If you can't find the file.** Open Claude Desktop, open the Settings menu, go to the Developer section and click Edit Config inside the servers section.

4. Add the following to your config file under the `"mcpServers"` key (replace `/path/to/repo` with the actual path):

    ```json
    {
        "mcpServers": {
            "perrynet@salesforce-cli-server": {
                "command": "node",
                "args": ["/path/to/repo/salesforce-mcp-server/build/index.js"]
            }
        }
    }
    ```

5. Restart Claude Desktop (quit & re-open the app). Now you are able to use the MCP in Claude Desktop.

#### Use it with Claude Code

1. Install [Claude Code](https://www.anthropic.com/claude-code).
2. Clone this repository and run `npm install && npm run build`.
3. Execute the following command in your terminal (replace `/path/to/repo` with the actual path):

    ```shell
    claude mcp add perrynet@salesforce-cli-server node /path/to/repo/salesforce-mcp-server/build/index.js
    ```

    This adds the MCP server in user scope for global access across all projects.

#### Use it with Codex CLI

Clone this repository and build the server. Then configure Codex CLI by adding an [mcp_servers](https://github.com/openai/codex/blob/main/codex-rs/config.md#mcp_servers) section in `~/.codex/config.toml` (replace `/path/to/repo` with the actual path):

```toml
[mcp_servers.perrynet@salesforce-cli-server]
command = "node"
args = ["/path/to/repo/salesforce-mcp-server/build/index.js"]
```

#### Use it with VS Code

1. Clone this repository and run `npm install && npm run build`.
2. In VS Code, open the Command Palette by pressing `Command + Shift + P` or `Ctrl + Shift + P`.
3. Type "MCP Add", select the `MCP: Add Server` option.
4. Select `Command(stdio)` option.
5. Enter the command: `node`
6. Enter the args: `/path/to/repo/salesforce-mcp-server/build/index.js` (replace with actual path)
7. For MCP Server Id put `perrynet@salesforce-cli-server`.
8. Choose either `Global` or `Workspace` installation option.

**Alternative: Workspace-specific configuration for GitHub Copilot**

If you want to configure the MCP server for a specific VS Code workspace (useful for GitHub Copilot integration), create or edit `.vscode/mcp.json` in your workspace root (replace `/path/to/repo` with actual path):

```json
{
  "mcpServers": {
    "perrynet@salesforce-cli-server": {
      "command": "node",
      "args": [
        "/path/to/repo/salesforce-mcp-server/build/index.js"
      ]
    }
  }
}
```

This configuration:
- ✅ Enables Salesforce tools in GitHub Copilot Chat within VS Code
- ✅ Scoped to the specific workspace/project
- ✅ Automatically activated when you open the workspace
- ✅ No global configuration needed

After creating the file, reload VS Code or restart the Copilot extension for the changes to take effect.

#### Use it with Cursor

1. Install [Cursor](https://cursor.com/downloads)
2. Open it up and create your account and connect to a model provider
3. Open `Cursor` -> `Settings` -> `Cursor Settings` -> `Mcp`
4. `Add new global MCP Server`
5. This will drop you into an editor of the JSON config. Fill in a value for the key `salesforce-cli-mcp`:

    ```json
    {
        "mcpServers": {
            "salesforce-cli-mcp": {
                "command": "npx",
                "args": ["salesforce-cli-mcp"]
            }
        }
    }
    ```

    > If there are any existing keys under mcpServer, don't delete them. Add salesforce-cli-mcp to the end.

6. Save the file. Go back to the `Cursor Settings` tab. You should see salesforce-cli-mcp listed and the dot should go green.
7. Open `Composer` view and toggle from `normal` to `agent` (small text on bottom of input)
8. You can now use tools

## Configuration

### Project-Based Authentication

Salesforce MCP Server v2.0 uses a **project-based authentication model**. This means:

- **No environment variables required** - The server uses your local Salesforce DX project configuration
- **All tools require a `sourcePath` parameter** - This is the absolute path to your Salesforce DX project directory
- **Uses `.sf/config.json`** - The server reads org authentication from your project's `.sf` directory
- **Filesystem-based access control** - Access is controlled by file permissions on your project directory

### Requirements

For the server to work, you need:

1. **Valid Salesforce DX project structure** with a `.sf` directory
2. **Authenticated org(s)** configured in your project (via `sf org login` or default org settings)
3. **Salesforce CLI installed** and accessible in your PATH

### Project Structure Example

```
/Users/yourname/sf-projects/my-salesforce-app/
├── .sf/
│   └── config.json          # Contains org configuration
├── force-app/
│   └── main/
│       └── default/
├── sfdx-project.json
└── ...
```

When using tools, you'll provide the project path:

```
sourcePath: "/Users/yourname/sf-projects/my-salesforce-app"
```

### Target Org Selection

Most tools accept an optional `targetOrg` parameter:

- **If provided**: Uses the specified org alias or username
- **If omitted**: Uses the default org configured in your project's `.sf/config.json`

This gives you flexibility to work with multiple orgs from the same project.

### Authentication Setup

Before using the MCP server, ensure your Salesforce DX project is properly configured:

```bash
# Navigate to your Salesforce DX project
cd /path/to/your/salesforce-project

# Login to your org (if not already authenticated)
sf org login web --alias my-dev-org

# Set as default org (optional)
sf config set target-org my-dev-org

# Verify authentication
sf org list
```

Once authenticated, the MCP server will use this configuration when you provide the project path.

## How to use it

Once the SF MCP Server is configured in your AI client, you can interact with Salesforce using natural language. The AI assistant will have access to 36 powerful tools:

### Available Tools

#### 1. List Connected Salesforce Orgs

View all Salesforce orgs currently authenticated with the Salesforce CLI.

**Example prompts:**

- "Show me all connected Salesforce orgs"
- "List my available Salesforce organizations"
- "Which Salesforce orgs can I access?"

#### 2. List Objects in an Org

Retrieve all standard and custom objects available in a specific Salesforce org.

**Example prompts:**

- "List all custom objects in my dev org"
- "Show me all objects in the production org"
- "What custom objects exist in sandbox1?"

#### 3. Describe an Object

Get detailed metadata about a specific Salesforce object, including fields, relationships, and properties.

**Example prompts:**

- "Describe the Account object in my org"
- "Show me all fields on the Custom_Object\_\_c in dev org"
- "What are the relationships on the Contact object?"

#### 4. Execute Apex Code

Run anonymous Apex code directly in a Salesforce org and see the debug output.

**Example prompts:**

- "Execute this Apex in my dev org: System.debug('Hello World');"
- "Run a query in Apex to count all Accounts"
- "Execute Apex code to create a test Account record"

#### 5. Query Records

Execute SOQL queries and retrieve results in JSON format.

**Example prompts:**

- "Query the first 10 Accounts from my org"
- "Find all Contacts with email domain '@example.com'"
- "Get Opportunities closed this month with amount over $10,000"
- "Query all Case records created today"

#### 6. Query Records to File

Execute SOQL queries and save results to CSV or JSON files.

**Example prompts:**

- "Export all Leads to a CSV file"
- "Save all Opportunities from Q4 2024 to a JSON file"
- "Create a CSV export of Accounts with their related Contacts"

#### 7. Run Apex Tests

Execute Apex test classes with various options including test level and code coverage.

**Example prompts:**

- "Run all tests in my dev org"
- "Execute the AccountTriggerTest class with code coverage"
- "Run all local tests excluding managed packages"

#### 8. Get Apex Test Results

Retrieve results from a previous asynchronous Apex test run.

**Example prompts:**

- "Get the results of test run ID 707xx0000000001"
- "Show me the code coverage from the last test run"

#### 9. Get Apex Code Coverage

Get code coverage information for a Salesforce org.

**Example prompts:**

- "What's the overall code coverage in my org?"
- "Show code coverage from the latest test run"

#### 10. Generate Apex Class

Generate metadata source files for a new Apex class.

**Example prompts:**

- "Generate a new Apex class called AccountHelper"
- "Create an Apex controller class named MyCustomController"
- "Generate a batch class called DataCleanupBatch in the classes directory"

#### 11. Generate Apex Trigger

Generate metadata source files for a new Apex trigger.

**Example prompts:**

- "Generate a trigger called AccountTrigger for the Account object"
- "Create a before insert trigger for the Contact object"
- "Generate an after update trigger for MyCustomObject\_\_c"

#### 12. List Apex Logs

Fetch and list Apex debug logs from the org.

**Example prompts:**

- "Show me all Apex debug logs in my dev org"
- "List the recent debug logs from production"
- "Get the IDs of debug logs in sandbox"

#### 13. Get Apex Log

Fetch specific Apex debug logs or recent logs from the org.

**Example prompts:**

- "Get the debug log with ID 07L...."
- "Show me the last 5 debug logs from my org"
- "Fetch the most recent debug log from production"

#### 14. Login to Salesforce Org

Authenticate and login to a Salesforce org via web browser.

**Example prompts:**

- "Login to a new production org with alias 'prod'"
- "Connect to a sandbox with alias 'dev-sandbox'"

#### 15. Run Code Analyzer

Analyze your code with configurable rules to ensure good coding practices.

**Example prompts:**

- "Run code analyzer on all Apex classes"
- "Analyze my Lightning Web Components for security issues"
- "Check PMD rules on the force-app directory"

#### 16. List Code Analyzer Rules

List available rules for code analysis.

**Example prompts:**

- "Show me all available code analyzer rules"
- "List security-related code analysis rules"
- "What ESLint rules are available?"

#### 17. Scanner Run

Scan a codebase with various security and quality rules using multiple engines.

**Example prompts:**

- "Scan all Apex files for security vulnerabilities"
- "Run PMD and ESLint scanners on my codebase"
- "Check for retire-js vulnerabilities in my JavaScript files"
- "Scan with high severity threshold and save results to CSV"

#### 18. Scanner Run DFA

Run Salesforce Graph Engine for data flow analysis to identify complex security issues.

**Example prompts:**

- "Run data flow analysis on my Apex controllers"
- "Check for SOQL injection vulnerabilities using Graph Engine"
- "Perform path-based security analysis on all Apex classes"
- "Run DFA with pilot rules enabled"

#### 19. Assign Permission Set

Assign permission sets to one or more org users.

**Example prompts:**

- "Assign the DreamHouse permission set to the admin user in my dev org"
- "Grant CloudHouse and AppBuilder permission sets to user@example.com"
- "Assign multiple permission sets to a list of users in sandbox"

#### 20. Assign Permission Set License

Assign permission set licenses to org users.

**Example prompts:**

- "Assign the Sales Cloud license to user@example.com"
- "Grant Service Cloud permission set license to multiple users"
- "Assign Platform Event license to the admin user"

#### 21. Display User

Display information about a Salesforce user including profile, org ID, and access details.

**Example prompts:**

- "Show me information about the admin user in my org"
- "Display user details for user@example.com"
- "Get the profile and access token for the current user"

#### 22. List Metadata

List metadata components and properties of a specified type.

**Example prompts:**

- "List all CustomObject components in my org"
- "Show me all Dashboard components in the Sales folder"
- "Get all EmailTemplate metadata with API version 60.0"
- "List Layout components and save to a file"

#### 23. List Metadata Types

Display details about all metadata types enabled for your org.

**Example prompts:**

- "Show me all available metadata types in my org"
- "List metadata types for package.xml creation"
- "Get all enabled metadata types with API version 60.0"
- "Display metadata types and save to file for reference"

#### 24. Logout

Log out of a Salesforce org, removing stored authentication.

**Example prompts:**

- "Logout from my dev org"
- "Remove authentication for sandbox1"
- "Logout from all connected orgs"

#### 25. Open

Open a Salesforce org in your browser.

**Example prompts:**

- "Open my dev org in Chrome"
- "Open the Lightning Experience page in my sandbox"
- "Open my org in private/incognito mode"
- "Open a Visualforce page /apex/MyPage in production"
- "Open my FlexiPage in Lightning App Builder"

#### 26. Open Record

Open a specific Salesforce record in the browser.

**Example prompts:**

- "Open record 001XX0000XXXXX in my dev org"
- "Navigate to Account record 001... in production"
- "Show me the Contact record 003... in the browser"

#### 27. Create Record

Create a new record in a Salesforce org using the REST API.

**Example prompts:**

- "Create a new Account with Name 'Acme Corp' and Type 'Customer'"
- "Insert a Contact record with FirstName 'John' and LastName 'Doe'"
- "Create a Case with Subject 'Technical Issue' and Priority 'High'"
- "Add a new Lead with Company 'Tech Startup' and Email 'lead@example.com'"

#### 28. Update Record

Update an existing record in a Salesforce org using the REST API.

**Example prompts:**

- "Update Account 001XX... to set BillingCity to 'San Francisco'"
- "Change the Status of Opportunity 006XX... to 'Closed Won'"
- "Update Contact 003XX... with Phone '(555) 123-4567'"
- "Modify Case 500XX... to set Priority to 'Critical'"

#### 29. Delete Record

Delete a record from a Salesforce org using the REST API.

**Example prompts:**

- "Delete the Account record 001XX..."
- "Remove Contact 003XX... from the org"
- "Delete Lead record 00QXX..."
- "Remove the test Case record 500XX..."

#### 30. Package Install

Install or upgrade a package version in a Salesforce org.

**Example prompts:**

- "Install package 04tXXXXXXXXXXXXXX in my dev org"
- "Upgrade the package with ID 04t... in production with 10 minute wait time"
- "Install a protected package with key 'mykey123' in sandbox"
- "Install package and compile only package Apex code"
- "Upgrade unlocked package and deprecate removed components"

#### 31. Package Uninstall

Uninstall a second-generation package from a Salesforce org.

**Example prompts:**

- "Uninstall package 04tXXXXXXXXXXXXXX from my dev org"
- "Remove the package with alias 'old_package' from production"
- "Uninstall package and wait 5 minutes for completion"
- "Remove package with spaces in alias from sandbox"

#### 32. Schema Generate Tab

Generate metadata source files for a new custom tab on a custom object.

**Example prompts:**

- "Create a tab for MyObject\_\_c with icon 54 in the tabs directory"
- "Generate a custom tab for Invoice\_\_c object with icon 25"
- "Add a navigation tab for Customer\_\_c with icon 75 in force-app/main/default/tabs"
- "Create a tab for Product\_\_c custom object with default icon"

#### 33. Search Records

Execute SOSL text-based searches across multiple objects. This is the primary tool for finding records that mention or contain specific text across your Salesforce org.

**Example prompts:**

- "Search for 'Anna Jones' in all Name fields"
- "Find records containing 'Acme' across all objects"
- "Search for phone number '415-555-1234' in Contact and Lead"
- "Find all records mentioning our competitor 'Acme Corp' across Accounts, Opportunities, and Cases"
- "Execute SOSL: FIND {Smith} IN ALL FIELDS RETURNING Contact, Lead"

#### 34. Generate Lightning Component

Generate Lightning Web Components (LWC) or Aura components with configurable templates and output directories.

**Example prompts:**

- "Generate a Lightning Web Component called AccountList"
- "Create an Aura component named ContactForm in the components directory"
- "Generate an LWC with analyticsDashboard template called SalesMetrics"
- "Create a Lightning component MyCustomView with default template"

#### 35. Deploy Metadata to Org

Deploy metadata components to a Salesforce org with various configuration options including test execution.

**Example prompts:**

- "Deploy all metadata from force-app directory to my dev org"
- "Validate deployment to production with all tests but don't save (dry run)"
- "Deploy specific Apex classes matching 'Account*' pattern to sandbox"
- "Deploy using package.xml manifest with RunLocalTests"
- "Deploy metadata and run specific test classes: TestClass1, TestClass2"

### Practical Examples

#### Example 1: Data Analysis

```
User: "I need to analyze our customer data. First, show me what custom objects we have in the production org."

AI: [Lists all custom objects]

User: "Great! Now query all Customer__c records created this year and export them to CSV."

AI: [Executes query and creates CSV file]
```

#### Example 2: Debugging

```
User: "I'm having issues with a trigger. Can you execute this Apex to test it:
List<Account> accs = [SELECT Id, Name FROM Account LIMIT 5];
for(Account a : accs) {
    System.debug('Account: ' + a.Name);
}"

AI: [Executes the code and shows debug logs]
```

#### Example 3: Schema Documentation

```
User: "I need to document our data model. Can you describe the Order__c object including all its fields and relationships?"

AI: [Provides detailed object metadata]
```

### Tips for Best Results

1. **Provide Your Project Path**: When working with the AI assistant, mention your Salesforce DX project directory:
    - "Use my Salesforce project at /Users/myname/sfdx-projects/my-app"
    - "Working with the project in ~/workspace/salesforce-app"
    - The AI will use this path for all subsequent tool calls

2. **Specify the Target Org** (Optional): Mention which org alias to use, or rely on the project's default org:
    - "Query Accounts from my dev-sandbox org"
    - "Run tests in the production org"
    - If omitted, uses the project's default org configuration

3. **Be Specific with Queries**: Provide field names and conditions for SOQL queries
    - Good: "Query Account records with Type = 'Customer' and show Id, Name, and CreatedDate"
    - Less specific: "Get some Accounts"

4. **Object Names**: You can use either user-friendly names or API names - the AI assistant will use the describe tools to find the correct API names
    - Both work: "Query Custom Object records" or "Query Custom_Object\_\_c records"
    - The assistant will automatically resolve field names too

5. **Apex Code Formatting**: When providing Apex code, you can use code blocks or inline code

6. **File Exports**: Specify the format (CSV or JSON) when exporting query results

### Troubleshooting

#### Project Path Issues

**"Path does not exist"** or **"Not a directory"**:
- Verify the path is correct and absolute (e.g., `/Users/name/projects/my-sf-app`, not `~/projects/my-sf-app`)
- Ensure you have read permissions on the directory
- Check for typos in the path

**".sf directory not found"**:
- Your project must have a `.sf` directory with `config.json`
- Run `sf org list` in your project directory to initialize the `.sf` directory
- Ensure you're pointing to the project root, not a subdirectory

**"Path is empty"**:
- The `sourcePath` parameter is required for most tools
- Provide the absolute path to your Salesforce DX project directory

#### Authentication Issues

**"No authenticated org found"** or **"No orgs found"**:
- Run `sf org login web` in your project directory to authenticate
- Verify authentication with `sf org list`
- Check that your access token hasn't expired

**"Expired access/refresh token"**:
- Re-authenticate: `sf org login web --alias my-org`
- Some orgs require periodic re-authentication

#### General Issues

**"Object not found"**:
- Verify the object exists and you're using the correct API name
- Use the `sobject_list` tool to see all available objects

**"Query error"**:
- Check your SOQL syntax and field names
- Use the `sobject_describe` tool to see available fields

**"Apex execution failed"**:
- Review the debug logs for specific error messages
- Ensure you have appropriate permissions in the org

**"Command not found: sf"**:
- Install Salesforce CLI: https://developer.salesforce.com/tools/salesforcecli
- Ensure `sf` is in your system PATH
- Restart your AI client after installing the CLI

### Security Considerations

- The server executes commands with the permissions of the authenticated Salesforce user
- Be cautious when executing DML operations in production orgs
- Review Apex code before execution, especially in production environments
- Consider using sandbox orgs for testing and development

### Building Desktop Extension (DXT) Locally

If you want to build the Desktop Extension file yourself:

1. Clone the repository and navigate to the `salesforce-cli-mcp` directory
2. Install dependencies: `npm install`
3. Build the DXT file: `npm run build:dxt`
4. The `.dxt` file will be created in the `dist/` directory
5. Share this file with others for easy one-click installation
