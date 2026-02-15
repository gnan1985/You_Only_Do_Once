# Workflow Execution Architecture

## Overview

This document explains how the "You Only Do Once" application loads a workflow JSON file and executes it step-by-step using MCP (Model Context Protocol) tools.

## Execution Flow Diagram

```
User clicks 'Execute' in UI
    ↓
app.js calls window.electronAPI.executeWorkflow(workflowId)
    ↓
IPC message sent to main.js
    ↓
main.js 'execute-workflow' handler
    ↓
storage.getWorkflow(id) - Loads workflow JSON file
    ↓
executor.execute(workflow)
    ↓
Loop through workflow.analysis.steps
    ↓
For each step, call executeStep
    ↓
mcpTools.executeTool(tool, tool_action, parameters)
    ↓
Load tool module (e.g., shell.js)
    ↓
Call tool method (e.g., execute_command)
    ↓
Execute and return result
    ↓
Log execution result
    ↓
Return to UI - Show execution log
```

## Detailed Execution Walkthrough

### Step 1: User Triggers Execution (UI Layer)

**File:** `src/renderer/app.js`

```javascript
executeWorkflowDirect(workflowId) {
  const result = await window.electronAPI.executeWorkflow(workflowId);
  // Shows execution log to user
}
```

The user clicks the "Execute" button in the Electron UI, which calls the Electron API exposed through the preload bridge.

---

### Step 2: IPC Message to Main Process (Electron Bridge)

**Files:** `preload.js`, `main.js`

**Preload Script:**
```javascript
// preload.js exposes this to renderer
executeWorkflow: (id) => ipcRenderer.invoke('execute-workflow', id)
```

**Main Process Handler:**
```javascript
// main.js handles the IPC message
ipcMain.handle('execute-workflow', async (event, id) => {
  const workflow = storage.getWorkflow(id);  // Load from JSON file
  if (!workflow) {
    return { success: false, error: 'Workflow not found' };
  }
  const result = await executor.execute(workflow);
  return { success: true, result };
});
```

The renderer process sends an IPC message to the main Electron process with the workflow ID.

---

### Step 3: Load Workflow JSON File

**File:** `src/modules/storage.js`

```javascript
getWorkflow(id) {
  try {
    const filePath = path.join(workflowsDir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      logger.warn(`Workflow not found: ${id}`);
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);  // Your workflow.json becomes JS object
  } catch (error) {
    logger.error('Error getting workflow:', error);
    throw error;
  }
}
```

The storage module reads the JSON file from disk and parses it into a JavaScript object.

**Example loaded JSON structure:**
```json
{
  "id": "c3d4e5f6-a7b8-4c5d-8e9f-0a1b2c3d4e5f",
  "name": "Move Test Data Files",
  "recordedData": { ... },
  "analysis": {
    "goal": "Move all files from source to destination",
    "steps": [
      {
        "step_number": 1,
        "description": "List all files in the source test_data directory",
        "tool": "filesystem",
        "tool_action": "list_files",
        "parameters": {
          "path": "C:\\Users\\J\\Documents\\development\\ai skills\\data-analyzer\\test_data"
        },
        "expected_output": "Array of file names and directory contents",
        "error_handling": "stop"
      },
      {
        "step_number": 2,
        "description": "Create the destination directory if it doesn't exist",
        "tool": "filesystem",
        "tool_action": "file_exists",
        "parameters": {
          "path": "C:\\Users\\J\\Documents\\test_data"
        },
        "expected_output": "True or false indicating if directory exists",
        "error_handling": "continue"
      },
      {
        "step_number": 3,
        "description": "Move all files from source to destination using shell move command",
        "tool": "shell",
        "tool_action": "execute_command",
        "parameters": {
          "command": "move \"C:\\Users\\J\\Documents\\development\\ai skills\\data-analyzer\\test_data\\*.*\" \"C:\\Users\\J\\Documents\\test_data\\\"",
          "cwd": "C:\\Users\\J\\Documents\\development\\ai skills\\data-analyzer\\test_data"
        },
        "expected_output": "Files successfully moved to destination directory",
        "error_handling": "stop"
      },
      {
        "step_number": 4,
        "description": "Verify that destination directory now contains the moved files",
        "tool": "filesystem",
        "tool_action": "list_files",
        "parameters": {
          "path": "C:\\Users\\J\\Documents\\test_data"
        },
        "expected_output": "List of files now in destination directory",
        "error_handling": "continue"
      }
    ],
    "adaptive_rules": [...],
    "confidence_score": 0.95,
    "notes": "..."
  },
  "createdAt": "2026-02-14T18:10:00Z",
  "executionHistory": []
}
```

---

### Step 4: Execute Workflow

**File:** `src/modules/executor.js`

```javascript
async execute(workflow) {
  try {
    logger.info(`Starting execution of workflow: ${workflow.id}`);

    const analysis = workflow.analysis;
    if (!analysis || !analysis.steps) {
      throw new Error('Workflow analysis missing or invalid');
    }

    const executionLog = [];
    const results = [];

    // Loop through each step defined in the JSON
    for (let i = 0; i < analysis.steps.length; i++) {
      const step = analysis.steps[i];  // Get Step 1, Step 2, etc.
      logger.info(`Executing step ${i + 1}: ${step.description}`);

      try {
        const result = await this.executeStep(step, executionLog);
        results.push(result);
        
        executionLog.push({
          step: i + 1,
          description: step.description,
          status: 'success',
          result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error(`Error executing step ${i + 1}:`, error);
        
        executionLog.push({
          step: i + 1,
          description: step.description,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        // Handle error based on error_handling instruction in JSON
        if (step.error_handling === 'stop') {
          return {
            success: false,
            error: `Failed at step ${i + 1}: ${error.message}`,
            executionLog,
            completedSteps: i,
            totalSteps: analysis.steps.length,
          };
        } else if (step.error_handling === 'continue') {
          logger.warn(`Continuing after error in step ${i + 1}`);
          continue;
        }
      }
    }

    logger.info(`Workflow execution completed successfully: ${workflow.id}`);
    return {
      success: true,
      workflowId: workflow.id,
      executionLog,
      results,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error executing workflow:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}
```

The executor loops through each step in the `analysis.steps` array and executes them sequentially.

---

### Step 5: Execute Individual Step

**File:** `src/modules/executor.js`

```javascript
async executeStep(step, previousLog) {
  try {
    const tool = step.tool;              // "shell"
    const toolAction = step.tool_action; // "execute_command"
    const parameters = step.parameters;  // { command: "move ...", cwd: "..." }

    logger.debug(`Executing tool: ${tool}.${toolAction}`, { parameters });

    // Map tool names to categories for MCP execution
    const toolMapping = {
      filesystem: 'filesystem',
      file: 'filesystem',
      spreadsheet: 'spreadsheet',
      web: 'web',
      shell: 'shell',
    };

    const toolCategory = toolMapping[tool] || tool;

    // Use mcpTools.executeTool which handles the actual execution
    const result = await mcpTools.executeTool(toolCategory, toolAction, parameters);

    return {
      tool,
      toolAction,
      parameters,
      result,
      success: true,
    };
  } catch (error) {
    logger.error('Error executing step:', error);
    throw error;
  }
}
```

This method extracts the tool information from the step JSON and prepares it for execution.

---

### Step 6: Execute MCP Tool

**File:** `src/modules/mcp-tools.js`

```javascript
async executeTool(toolCategory, toolName, parameters) {
  try {
    logger.info(`Executing tool: ${toolCategory}.${toolName}`, { parameters });

    const toolModule = this.tools[toolCategory];  // Load e.g. shell.js
    if (!toolModule) {
      throw new Error(`Tool category not found: ${toolCategory}`);
    }

    if (typeof toolModule[toolName] !== 'function') {
      throw new Error(`Tool not found: ${toolCategory}.${toolName}`);
    }

    const result = await toolModule[toolName](parameters);
    logger.info(`Tool executed successfully: ${toolCategory}.${toolName}`);
    return result;
  } catch (error) {
    logger.error(`Error executing tool ${toolCategory}.${toolName}:`, error);
    throw error;
  }
}
```

The MCP tools manager loads the appropriate tool module (e.g., `shell.js`) and calls the requested method with the parameters.

---

### Step 7: Execute Tool Implementation

**File:** `src/tools/shell.js`

```javascript
async function execute_command(params) {
  try {
    const { command, cwd } = params;
    
    // YOUR MOVE COMMAND HERE:
    // command = 'move "C:\Users\J\Documents\development\ai skills\data-analyzer\test_data\*.*" "C:\Users\J\Documents\test_data\"'
    
    const { execSync } = require('child_process');
    const output = execSync(command, { cwd });  // 🎯 FILES GET MOVED HERE!
    
    logger.debug(`Command executed: ${command}`);
    return {
      success: true,
      output: output.toString(),
      command: command
    };
  } catch (error) {
    logger.error('Error executing command:', error);
    throw error;
  }
}

module.exports = {
  execute_command,
  list_directory,
  create_directory,
  remove_directory,
  get_output,
};
```

The actual tool implementation executes the Windows move command, which physically moves the files on disk.

---

### Step 8: Return Results to UI

The results bubble back up through the call stack:
- `execute_command()` → `executeTool()` → `executeStep()` → `execute()`
- Main process returns result to IPC
- UI receives execution log and displays it

**Example execution log returned to UI:**
```javascript
{
  "success": true,
  "executionLog": [
    {
      "step": 1,
      "description": "List all files in the source test_data directory",
      "status": "success",
      "result": { "files": [...], "count": 9 }
    },
    {
      "step": 2,
      "description": "Check if destination exists",
      "status": "success",
      "result": true
    },
    {
      "step": 3,
      "description": "Move all files using shell move command",
      "status": "success",
      "result": { "output": "9 file(s) moved." }  // ✅ FILES MOVED!
    },
    {
      "step": 4,
      "description": "Verify that destination directory now contains the moved files",
      "status": "success",
      "result": { "files": [...], "count": 9 }
    }
  ]
}
```

---

### Step 9: Display Execution Log in UI

**File:** `src/renderer/app.js`

```javascript
// Loop through executionLog and display:
// Step 1: List all files ✅ 9 files found
// Step 2: Check if destination exists ✅ Exists
// Step 3: Move all files ✅ 9 file(s) moved
// Step 4: Verify destination ✅ 9 files in destination
```

The UI displays the execution results to the user in a readable format.

---

## Key Data Structure: The Workflow JSON

The workflow JSON is the **blueprint** that contains the complete instructions for automation.

| JSON Property | What It Means | Where It's Used |
|---|---|---|
| `id` | Unique workflow identifier | Filename: `{id}.json` |
| `name` | Human-readable workflow name | Display in UI |
| `recordedData` | Original user actions & intents | Archive/reference |
| `analysis` | AI-generated semantic procedures | **Execution engine** |
| `analysis.goal` | What the workflow accomplishes | Display in UI |
| `analysis.variables` | Extracted variables from workflow | Context for execution |
| `analysis.steps[]` | Sequential operations to perform | **Loop in executor** |
| `analysis.steps[].tool` | Which MCP tool to use | mcpTools.executeTool() |
| `analysis.steps[].tool_action` | Which method in the tool | Tool module function name |
| `analysis.steps[].parameters` | Arguments to pass to tool | Directly passed to function |
| `analysis.steps[].error_handling` | How to handle failures | `stop`, `continue`, or `ask` |
| `analysis.adaptive_rules` | Rules for detecting/adapting to changes | Future enhancement |
| `executionHistory` | Log of past executions | Workflow statistics |

---

## Complete Execution Example: "Move Test Data Files"

### Workflow JSON (Step 3 - The Move Command)
```json
{
  "step_number": 3,
  "description": "Move all files from source to destination using shell move command",
  "tool": "shell",
  "tool_action": "execute_command",
  "parameters": {
    "command": "move \"C:\\Users\\J\\Documents\\development\\ai skills\\data-analyzer\\test_data\\*.*\" \"C:\\Users\\J\\Documents\\test_data\\\"",
    "cwd": "C:\\Users\\J\\Documents\\development\\ai skills\\data-analyzer\\test_data"
  },
  "expected_output": "Files successfully moved to destination directory",
  "error_handling": "stop"
}
```

### Execution Path
1. **Executor** reads Step 3 from JSON
2. **Executor** calls `executeStep(step)`
3. **executeStep()** extracts:
   - `tool = "shell"`
   - `toolAction = "execute_command"`
   - `parameters = { command: "move ...", cwd: "..." }`
4. **Executor** calls `mcpTools.executeTool("shell", "execute_command", parameters)`
5. **MCPTools** loads `src/tools/shell.js`
6. **MCPTools** calls `shell.execute_command(parameters)`
7. **shell.js** calls `execSync(command, { cwd })`
8. **Windows** executes: `move "source\*.*" "dest\"`
9. **9 files move** from source to destination directory
10. **Result** returned: `{ success: true, output: "9 file(s) moved." }`
11. **UI** displays: ✅ Step 3 success

---

## Error Handling

Each step in the JSON specifies how to handle failures:

```javascript
if (step.error_handling === 'stop') {
  // Immediately halt execution and return error
  return { success: false, error: "Failed at step X" };
} else if (step.error_handling === 'continue') {
  // Log the error but continue to next step
  logger.warn(`Continuing after error in step ${i + 1}`);
  continue;
}
```

For the move workflow:
- Step 1 (list files): `error_handling: "stop"` - critical, must succeed
- Step 2 (check exists): `error_handling: "continue"` - non-critical
- Step 3 (move files): `error_handling: "stop"` - critical operation
- Step 4 (verify): `error_handling: "continue"` - informational

---

## Summary

The workflow execution architecture follows this pattern:

1. **JSON File** = Blueprint (what to do)
2. **Executor** = Sequencer (process steps in order)
3. **MCP Tools** = Dispatcher (load right tool)
4. **Tool Modules** = Implementation (actually do it)
5. **Logging** = Audit trail (what happened)

This design allows AI to generate automation workflows as JSON, which anyone can execute without understanding the underlying code. The system is:
- **Declarative**: Steps are declared in JSON
- **Modular**: Tools are pluggable
- **Debuggable**: Full execution log visible
- **Extensible**: New tools can be added easily
- **Safe**: Error handling and dry-run support built-in
