# Task Detail Modal

## Overview
Comprehensive task inspection interface inspired by Linear/Multica, providing full context, execution logs, live monitoring, and human-in-the-loop controls.

## Key Features

### 1. **Dual View Modes**
- **Issue View** - Task metadata, description, activity, comments
- **Execution Log View** - Agent runtime inspection, tool trace, raw logs

### 2. **Layout Structure**
```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Issue/Exec Log Tabs] [Actions] [Close]            │
├─────────────────────────────────────┬───────────────────────┤
│                                     │                       │
│  Main Content Area                  │  Properties Sidebar   │
│  - Description                      │  - Status dropdown    │
│  - Activity Stream                  │  - Priority           │
│  - Execution Steps                  │  - Assignee           │
│  - Comments Thread                  │  - Project            │
│  - File Attachments                 │  - Links/Dependencies │
│                                     │  - Worker Info        │
│                                     │  - Telemetry          │
└─────────────────────────────────────┴───────────────────────┘
```

### 3. **Issue View Components**

#### Description Section
- **Markdown Rendering**: Full CommonMark support via `marked` library
- **Code Blocks**: Syntax highlighting with Prism.js
- **Mermaid Diagrams**: Inline diagram rendering
- **Tables**: Rich table formatting
- **Collapsible**: Can toggle visibility

#### Activity Stream
Real-time event log from Hermes backend:
```typescript
interface TaskActivity {
  id: number
  actor: string        // User or agent name
  actorAvatar: string  // Emoji icon
  action: string       // "created", "transitioned to ready", "commented"
  created_at: string   // ISO timestamp
}
```

Events displayed:
- Task creation
- Status transitions
- Assignee changes
- Priority updates
- Agent run starts/completions
- Comments posted
- File attachments uploaded

#### Comments Thread
```typescript
interface TaskComment {
  id: number
  author: string
  authorAvatar: string
  authorRole: 'human' | 'agent'
  body: string          // Markdown supported
  created_at: number    // Unix timestamp
}
```

Features:
- Threaded discussions
- Markdown formatting support
- Real-time updates via WebSocket
- Post new comments with Ctrl+Enter
- Emoji picker integration (future)
- @mentions for agents (future)

#### File Attachments & Deliverables
Categorized by file type:
- **📁 Terraform**: `.tf`, `.tfvars` files
- **📄 Config/IaC**: `.yaml`, `.yml`, `.json` CloudFormation/Ansible
- **📝 Documentation**: `.md`, `.txt`, `.rst`
- **🖼️ Diagrams**: `.svg`, `.png`, `.jpg` architecture diagrams
- **📊 Data**: `.csv`, `.parquet`, `.db`

Actions per file:
- **👁️ Preview**: In-app code/image viewer
- **📥 Download**: Direct file download
- **📋 Copy**: Copy file path to clipboard

### 4. **Execution Log View**

#### Two Sub-Tabs
1. **Steps Timeline** - Parsed tool execution trace
2. **Raw Log** - Complete unformatted output

#### Steps Timeline
Parses Hermes execution log into structured steps:
```typescript
interface ParsedStep {
  time: string      // "14:32:45"
  tool: string      // "Bash", "Read", "Write", "kanban_update"
  detail: string    // "git status", "src/App.tsx", etc.
  duration: string  // "1.2s"
}
```

Visual representation:
```
⚙️ 14:32:41 | Bash         | git status                    | 0.8s
📖 14:32:42 | Read         | src/App.tsx                   | 0.1s
✏️  14:32:43 | Write        | src/components/New.tsx        | 0.2s
📊 14:32:44 | kanban_update| Updated task status to done   | 0.3s
```

Features:
- Search/filter steps by tool name or keyword
- Expandable detail view for large outputs
- Timeline visualization
- Token/cost summary at bottom

#### Raw Log Display
```typescript
// Full execution transcript
<pre className="raw-log-output">
  {executionLog}
</pre>
```

Includes:
- Complete stdout/stderr capture
- Model reasoning (if enabled)
- Tool call JSON payloads
- Error traces
- Performance metrics

### 5. **Properties Sidebar**

#### Editable Fields
- **Status Dropdown**: Change task status inline
- **Priority Selector**: Urgent/High/Medium/Low
- **Assignee Picker**: Select from available agents
- **Project Selector**: Move task to different board

#### Read-Only Metadata
- **Created At**: Original timestamp
- **Updated At**: Last modification
- **Display ID**: Short task identifier
- **Estimate**: Complexity (S/M/L) and token estimate

#### Live Worker Info
When task is 'running', shows:
```typescript
interface WorkerProcessInfo {
  pid: number              // Process ID
  cpu_percent: number      // CPU usage %
  memory_rss_bytes: number // RAM in MB
  num_threads: number      // Thread count
  status: string           // "running", "sleeping"
  last_heartbeat: string   // "2s ago"
}
```

Displayed as:
```
🤖 Worker #12345
⚡ CPU: 45% | 💾 RAM: 512 MB
🧵 Threads: 8 | ❤️ 2s ago
[🛑 Terminate] [⏸️ Pause]
```

#### Dependency Links
```typescript
interface TaskLinksInfo {
  parents: TaskLinkItem[]     // Blocking tasks
  children: TaskLinkItem[]    // Dependent tasks
  blocked_by_active: boolean  // Has incomplete parents
}
```

Visual display:
- **⬆️ Blocks** - Parent tasks (must complete first)
- **⬇️ Blocked by** - Child tasks (waiting on this)
- Click link to jump to related task

#### Warnings & Diagnostics
- **⚠️ Blocked**: Shows which parent tasks prevent progress
- **🔴 Error**: Agent execution failures
- **💡 Suggestions**: Hermes recommendations

### 6. **Action Buttons**

#### Top-Right Actions
- **▶️ Run Agent** - Dispatch execution
- **💬 Add Comment** - Quick comment input
- **🔗 Copy Link** - Share task URL
- **🗑️ Delete** - Remove task (with confirmation)
- **⋯ More** - Additional actions menu

#### Status-Specific Actions
```typescript
// In Review
<button onClick={() => handleApprove()}>✅ Approve & Done</button>
<button onClick={() => handleRequestChanges()}>🔁 Request Changes</button>

// Blocked
<button onClick={() => viewBlockers()}>🔍 View Blockers</button>

// Running
<button onClick={() => terminateWorker()}>🛑 Emergency Stop</button>
```

### 7. **Real-time Updates**

#### WebSocket Integration
```typescript
// Listen for task changes
hermesApi.connectEvents((event) => {
  if (event.task_id === currentTask.id) {
    refreshTaskDetails()
  }
})
```

Auto-refreshes on:
- Status changes from other sessions
- New comments posted
- Agent run completion
- File attachments uploaded
- Worker heartbeat updates

#### Polling Fallback
- Refresh every 5 seconds while modal is open
- Ensures data freshness if WebSocket drops

## Technical Implementation

### Component: `TaskDetailModal.tsx`
```typescript
interface TaskDetailModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  agents: AIAgent[]
  allTasks?: Task[]
  activeBoard?: string
  kanbanConfig?: KanbanConfig
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void
  onRunAgent: (taskId: string) => Promise<boolean>
  onSendComment: (taskId: string, note: string) => Promise<boolean>
  onRefreshTasks?: () => void
  onDeleteTask?: (taskId: string) => Promise<boolean>
}
```

### Data Loading
```typescript
useEffect(() => {
  if (!isOpen || !task?.rawId) return
  
  const loadDetails = async () => {
    const details = await hermesApi.getTaskDetails(task.rawId, activeBoard)
    setComments(details.comments || [])
    setActivities(details.events || [])
    setAttachments(details.attachments || [])
    setLinks(details.links || {})
    setRuns(details.runs || [])
  }
  
  loadDetails()
  
  // Auto-refresh every 5s
  const interval = setInterval(loadDetails, 5000)
  return () => clearInterval(interval)
}, [isOpen, task, activeBoard])
```

### Execution Log Parsing
```typescript
function parseExecutionLog(rawLog: string): ParsedStep[] {
  const steps: ParsedStep[] = []
  const lines = rawLog.split('\n')
  
  for (const line of lines) {
    // Match pattern: [timestamp] ToolName: detail (duration)
    const match = line.match(/\[(\d{2}:\d{2}:\d{2})\] (\w+): (.*) \(([^)]+)\)/)
    if (match) {
      steps.push({
        time: match[1],
        tool: match[2],
        detail: match[3],
        duration: match[4]
      })
    }
  }
  
  return steps
}
```

## User Interactions

### Opening the Modal
- Click any task card in Kanban/Table view
- Click task link from search results
- Direct URL navigation: `?task=t_abc123`

### Keyboard Shortcuts
- `Esc` - Close modal
- `Ctrl+Enter` - Submit comment
- `E` - Edit description (future)
- `S` - Change status (future)

### Comment Thread
1. Click "Add Comment" or scroll to bottom
2. Type markdown-formatted message
3. Press Ctrl+Enter or click "Send"
4. Comment appears in thread immediately
5. Backend persists to Hermes SQLite

### Running Agent
1. Click "▶️ Run Agent" button
2. Modal stays open to watch live execution
3. Properties sidebar updates with worker PID
4. Steps timeline populates in real-time
5. Final status appears when complete

### Emergency Stop
1. Click "🛑 Terminate" in worker section
2. Confirmation dialog: "Stop worker PID 12345?"
3. Sends SIGTERM to process
4. After 5s, escalates to SIGKILL if still alive
5. Task status remains 'running' until cleanup

## Design Tokens (Aura Theme)

### Modal Container
```css
.task-detail-modal {
  width: 90vw;
  max-width: 1400px;
  height: 90vh;
  background: #191C21;
  border: 1px solid #2A2524;
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
}
```

### Typography
- **Title**: Inter, 20px, font-weight 600
- **Metadata**: JetBrains Mono, 11px
- **Body Text**: Geist, 14px
- **Code Blocks**: JetBrains Mono, 13px

### Color Usage
- **Primary Actions**: `#F97316` (Run, Submit)
- **Destructive**: `#EF4444` (Delete, Terminate)
- **Success**: `#10B981` (Approve)
- **Neutral**: `#6B7280` (Secondary actions)

## Integration Points

### Backend API Endpoints
```typescript
// Load full task context
GET /api/plugins/kanban/tasks/{id}/details?board={slug}

// Post comment
POST /api/plugins/kanban/tasks/{id}/comments
{ "body": "Comment text" }

// Terminate worker
POST /api/plugins/kanban/runs/{run_id}/terminate

// Download attachment
GET /api/plugins/kanban/attachments/{id}/download
```

### State Synchronization
```typescript
// When modal updates task, parent refreshes
onUpdateStatus(taskId, 'done')
  .then(() => onRefreshTasks())
  .then(() => closeModal())
```

## Performance Optimizations

1. **Lazy Loading**: Attachments loaded only when tab clicked
2. **Debounced Search**: 300ms delay on log search input
3. **Memoized Parsing**: Execution log parsed once, cached
4. **Virtual Scrolling**: Activity stream uses `react-window` for 1000+ events

## Accessibility

- Focus trap within modal
- Keyboard navigation between sections
- ARIA labels on all interactive elements
- Screen reader announcements for status changes
- High contrast borders and text

## Error Handling

### Failed Data Load
```typescript
try {
  const details = await hermesApi.getTaskDetails(taskId)
} catch (err) {
  setError('Could not load task details')
  // Show error state in modal
  // Allow retry button
}
```

### Comment Post Failure
```typescript
const posted = await onSendComment(taskId, commentText)
if (!posted) {
  // Keep comment in input field
  // Show error toast
  // Allow retry
}
```

## Future Enhancements
- Inline description editing
- Drag-to-attach files
- Comment reactions/threading
- Video playback for recorded runs
- Diff view for file changes
- Time tracking widget
- Watchers/subscribers list
- Export execution log as PDF
- Replay agent execution in debugger mode
