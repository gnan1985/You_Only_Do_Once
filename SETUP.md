# Setup & Installation Guide

## Prerequisites

- **Node.js** 16+ and npm
- **Windows 10+** (primary development platform)
- **API Key** - Choose one:
  - **Claude API Key** from [Anthropic](https://console.anthropic.com) (recommended)
  - **OpenAI API Key** from [OpenAI](https://platform.openai.com/api-keys)

## Quick Start

### 1. Install Dependencies

```bash
cd You_Only_Do_Once
npm install
```

This will install all required packages including:
- Electron (desktop framework)
- Express (backend server)
- Claude API client
- File/spreadsheet/shell tools

### 2. Configure API Provider

Create or update `.env` file. Choose **one** of the following setups:

**Option A: Claude (Anthropic)**
```env
AI_PROVIDER=claude
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
PORT=3000
NODE_ENV=development
```
Get your Claude API key from: https://console.anthropic.com/keys

Available Claude models:
- `claude-3-5-sonnet-20241022` (default) - Best balance of speed & quality
- `claude-3-opus-20250219` - Most capable, slower
- `claude-3-haiku-20250307` - Fastest, least capable

**Option B: OpenAI (ChatGPT)**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo
PORT=3000
NODE_ENV=development
```
Get your OpenAI API key from: https://platform.openai.com/api-keys

Available OpenAI models:
- `gpt-4-turbo` (default) - Most capable, higher cost
- `gpt-4` - Capable, moderate cost
- `gpt-3.5-turbo` - Fast & cheap, less capable

### 3. Start Development

```bash
npm run dev
```

This will:
- Start Express server on `http://localhost:3000`
- Launch Electron desktop app
- Open DevTools for debugging

### 4. First Workflow

1. Click **Record Workflow** in the sidebar
2. Name your workflow (e.g., "Process Test Results")
3. Click **Start Recording**
4. Perform your daily task (open file, edit data, save, etc.)
5. Click pause and add "intents" to describe what you're doing at key points
6. Click **Stop & Analyze**
7. Claude analyzes and generates semantic procedures
8. Click **Save Workflow**
9. Execute from the **Execute** tab

## Project Structure

```
You_Only_Do_Once/
├── main.js                    # Electron main process
├── preload.js                 # Electron security layer
├── server.js                  # Express backend
├── src/
│   ├── modules/              # Core business logic
│   │   ├── recorder.js        # Action/intent capture
│   │   ├── workflow-analyzer.js # Claude integration
│   │   ├── executor.js        # Workflow execution
│   │   ├── mcp-tools.js       # MCP tool definitions
│   │   └── storage.js         # Workflow persistence
│   ├── tools/                 # MCP tool implementations
│   │   ├── filesystem.js      # File operations
│   │   ├── spreadsheet.js     # Excel/CSV operations
│   │   ├── web.js             # Web/API operations
│   │   └── shell.js           # Shell commands
│   ├── renderer/              # Electron frontend
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── utils/                 # Helpers
│       ├── logger.js
│       └── helpers.js
└── data/
    └── workflows/             # Saved workflows (JSON)
```

## Key Features Implemented

### ✅ Recording System
- Capture mouse, keyboard, and app context changes
- **Intent pauses** - users describe what they're doing at key moments
- Full action timeline with timestamps
- Pause/resume functionality

### ✅ AI Analysis
- Claude analyzes recorded actions + intent descriptions
- Generates semantic **procedures** (not code)
- Identifies variables (filenames, patterns, data ranges)
- Detects error handling needs

### ✅ MCP Tools
- **Filesystem**: list, read, write, rename, delete files with pattern matching
- **Spreadsheet**: read/write Excel and CSV, sort, filter data
- **Web**: fetch URLs, parse HTML, submit forms
- **Shell**: execute commands, manage directories

### ✅ Workflow Execution
- Replays workflows using MCP tools (not mouse clicks)
- Intelligent adaptation to filename/pattern changes
- Graceful error handling with user fallback
- Execution history tracking

### ✅ User Interface
- **Dashboard**: overview of workflows and stats
- **Recorder**: real-time recording with intent input
- **Workflows Library**: browse, search, execute saved workflows
- **Execute**: run workflows with options for dry-run and step confirmation
- **Settings**: API configuration, export, history management

## API Endpoints

```
POST   /api/workflows              # Save recorded workflow
GET    /api/workflows              # List all workflows
GET    /api/workflows/:id          # Get specific workflow
POST   /api/workflows/:id/execute  # Execute workflow
DELETE /api/workflows/:id          # Delete workflow
POST   /api/analyze                # Analyze recorded actions
GET    /api/health                 # Health check
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | claude | AI provider to use: `claude` or `openai` |
| `CLAUDE_API_KEY` | - | Claude API key (required if using Claude) |
| `CLAUDE_MODEL` | claude-3-5-sonnet-20241022 | Claude model to use |
| `OPENAI_API_KEY` | - | OpenAI API key (required if using OpenAI) |
| `OPENAI_MODEL` | gpt-4-turbo | OpenAI model to use |
| `PORT` | 3000 | Express server port |
| `NODE_ENV` | development | Environment mode |
| `RECORD_INTERVAL` | 500 | Recording capture interval (ms) |
| `MAX_ACTIONS_PER_WORKFLOW` | 500 | Max action limit per recording |
| `LOG_LEVEL` | info | Logging level |

### Settings in UI

- **API Key**: Configure Claude API key in Settings
- **Record Interval**: How frequently to capture mouse position
- **Auto-confirm Steps**: Skip confirmation when executing
- **Dry Run**: Simulate execution without making changes

## Troubleshooting

### "Cannot find module 'electron'"
```bash
npm install electron --save-dev
```

### "CLAUDE_API_KEY or OPENAI_API_KEY is missing"
1. Go to Settings in the app
2. Enter your API key (Claude or OpenAI)
3. Or create `.env` file with the appropriate key:
   - For Claude: `CLAUDE_API_KEY=sk-ant-...`
   - For OpenAI: `OPENAI_API_KEY=sk-...`
4. Ensure `AI_PROVIDER` is set to either `claude` or `openai`

### "Port 3000 already in use"
```bash
# Change port in .env
PORT=3001
```

### RecordingJS errors
The recorder requires system APIs that may not work perfectly in sandboxed environments. For production use, consider:
- Using Puppeteer for browser automation
- Using Playwright for cross-platform automation
- Direct MCP tool calls for file/data operations

## Next Steps

### Phase 2: Enhancement
- [ ] Persistent intent markers during recording
- [ ] Real-time UI element detection during recording
- [ ] Conditional branching in workflows
- [ ] Loop detection and automation
- [ ] Integration with calendar/email for scheduling

### Phase 3: Advanced
- [ ] Cloud sync of workflows
- [ ] Team collaboration features
- [ ] Advanced pattern matching for filenames
- [ ] Machine learning for workflow adaptation
- [ ] Browser extension for web form automation

## Development Tips

### Enable Full DevTools
When app starts, DevTools opens automatically. Use it to:
- Debug API calls under Network tab
- Check console for errors
- Inspect React components

### Monitor Logs
```bash
# Watch log files
tail -f logs/combined.log
tail -f logs/error.log
```

### Test Workflows Locally
1. Create simple test file with known structure
2. Record workflow with clear intents
3. Run dry-run to see what Claude would do
4. Execute with step confirmation

## Support & Documentation

- **API Docs**: See comments in `src/tools/` files
- **Workflow Format**: See `data/workflows/` for saved examples
- **MCP Tools**: See tool definitions in `src/modules/mcp-tools.js`

## License

MIT
