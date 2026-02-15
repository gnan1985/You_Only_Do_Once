# You Only Do Once - AI Workflow Automation

An intelligent automation platform that learns your daily workflows and repeats them accurately using AI and MCP (Model Context Protocol) tools.

## Architecture

- **Recording**: Captures user actions with intent descriptions via pause points
- **Analysis**: Claude AI analyzes recorded workflows and generates semantic procedures
- **Execution**: Executes workflows using MCP tools (file system, APIs, shell commands, spreadsheets)
- **Adaptation**: Intelligently adapts to changes in filenames, data patterns, and UI layouts

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and add your Claude API key
3. Run `npm install`
4. Run `npm run dev` to start development mode

## Project Structure

```
.
├── main.js                    # Electron main process
├── preload.js                 # Electron preload/security
├── server.js                  # Express backend
├── src/
│   ├── modules/               # Core business logic
│   │   ├── recorder.js        # Records user actions & intent
│   │   ├── workflow-analyzer.js # Claude integration
│   │   ├── executor.js        # Executes workflows
│   │   ├── mcp-tools.js       # MCP tool definitions
│   │   └── storage.js         # Workflow persistence
│   ├── tools/                 # Individual MCP tools
│   │   ├── filesystem.js
│   │   ├── shell.js
│   │   ├── spreadsheet.js
│   │   └── web.js
│   ├── renderer/              # Electron frontend
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── utils/                 # Helper functions
│       ├── logger.js
│       └── helpers.js
├── data/                      # Stored workflows
└── logs/                      # Application logs
```

## Key Concepts

### Recording with Intent

Users record workflows with pause points where they describe their intent:
- Record action
- Pause and describe: "Renaming file to combine sample name"
- Continue recording
- AI analyzes all intent descriptions to understand semantic meaning

### MCP Tools

Instead of replaying mouse clicks, the system understands intent and uses:
- **File System**: list, read, write, rename, pattern matching
- **Spreadsheet**: read/write Excel and CSV
- **Web APIs**: fetch, parse, and submit data
- **Shell Commands**: execute CLI commands for complex operations

### Workflow Procedures

Recorded workflows become semantic procedures:
```
1. Find file matching pattern: test_results_*.xlsx
2. Extract sample name from filename
3. Open spreadsheet
4. Sort columns A-D by ascending date
5. Save with new name: [sample_name]_processed.xlsx
```

When replayed, Claude decides which MCP tools to use based on current system state.

## Development

- Install dependencies: `npm install`
- Start dev server: `npm run dev`
- Main process: `npm run electron`
- Backend: `npm run server`

## API Endpoints

- `POST /api/workflows` - Record new workflow
- `GET /api/workflows` - Get all workflows
- `POST /api/workflows/:id/execute` - Execute workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/analyze` - Analyze recorded actions

## License

MIT
