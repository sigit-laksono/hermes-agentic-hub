# Kanban Board

## Overview
Interactive Kanban board for visual task management with drag-and-drop functionality, inspired by Linear/Multica design aesthetics.

## Key Features

### 1. **Multi-Column Workflow**
- **Triage** - Initial task staging area, safe from auto-dispatch
- **Todo** - Scheduled backlog
- **Scheduled** - Time-based queue
- **Ready** - Tasks ready for agent pickup
- **Running** - Active execution by agents
- **Review** - Human-in-the-loop review queue
- **Blocked** - Tasks with unresolved dependencies
- **Done** - Completed tasks

### 2. **Drag-and-Drop Interface**
- Native HTML5 drag-and-drop implementation
- Visual feedback with opacity and border highlighting
- Optimistic UI updates with backend sync
- Automatic status validation (e.g., prevents direct transition to 'running')
- Graceful error handling with toast notifications on failed transitions

### 3. **Task Cards**
Each card displays:
- **Display ID** - Short identifier (e.g., #663b67e)
- **Title** - Task description
- **Priority Badge** - Urgent (red), High (orange), Medium (blue)
- **Assignee Avatar** - Agent profile icon and name
- **Project Tag** - Board/workspace affiliation
- **Status Indicators** - Blocked icon, subtask progress
- **Action Buttons** - Quick actions (Run, Comment, etc.)

### 4. **Column Headers**
- **Task Count Badge** - Real-time count per status
- **Add Task Button** - Create new task in specific column
- **Visual Design** - Subtle borders with Aura color tokens

### 5. **Multi-Select Mode**
- Click checkbox on card to enter selection mode
- Visual selection state with orange border
- Compatible with bulk operations toolbar
- Keyboard shortcut: `Ctrl/Cmd + A` to select all

### 6. **Real-time Updates**
- WebSocket event streaming from Hermes backend
- Automatic refresh on task state changes
- Fallback polling every 15 seconds
- Debounced updates (300ms) to prevent UI thrashing

## Technical Implementation

### Component: `KanbanBoard.tsx`
```typescript
interface KanbanBoardProps {
  tasks: Task[]
  agents: AIAgent[]
  activeBoard: string
  activeBoardName: string
  boardStats: BoardStats
  kanbanConfig: KanbanConfig
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void
  onOpenNewIssue: (status?: TaskStatus) => void
  onRunAgent: (taskId: string) => void
  onSendComment: (taskId: string, note: string) => Promise<boolean>
  onRefreshTasks: () => void
  onDeleteTask: (taskId: string) => Promise<boolean>
  selectedTaskIds: Set<string>
  onToggleSelect: (taskId: string) => void
}
```

### Status Transition Logic
```typescript
// Special handling for 'running' status
if (newStatus === 'running') {
  await handleRunAgent(taskId) // Uses /run endpoint, not status update
  return
}

// Backend validates all other transitions
try {
  await hermesApi.updateTaskStatus(target.rawId, newStatus, boardSlug)
} catch (err) {
  // Revert optimistic update on failure
  setTasks(prev => prev.map(t => 
    t.id === taskId ? { ...t, status: previousStatus } : t
  ))
  pushToast('error', `Could not move ${target.displayId} to ${newStatus}`, err.message)
}
```

### Drag-and-Drop API
- `onDragStart` - Captures task ID and sets drag image
- `onDragOver` - Prevents default to allow drop
- `onDragEnter/Leave` - Visual hover feedback
- `onDrop` - Triggers status update via `onUpdateTaskStatus`

## User Interactions

### Creating Tasks
1. Click **+ Add** button in any column header
2. Opens New Issue Modal with pre-selected status
3. Keyboard shortcut: Press `C` anywhere on board

### Moving Tasks
1. **Drag-and-Drop**: Grab card and drop in target column
2. **Card Menu**: Click card to open detail modal, change status via dropdown
3. **Bulk Move**: Select multiple cards, use bulk toolbar

### Running Agents
- Click **Play** icon on card
- Promotes task to 'ready' status if needed
- Dispatches to Hermes worker pool
- Card moves to 'Running' column when claimed

### Viewing Task Details
- Click anywhere on card (except drag handle or checkboxes)
- Opens full `TaskDetailModal` with:
  - Complete description
  - Activity stream
  - Execution logs
  - File attachments
  - Comments thread

## Keyboard Shortcuts
- `B` - Switch to Board view
- `C` - Create new issue
- `Ctrl/Cmd + K` - Global search
- `Ctrl/Cmd + A` - Select all tasks
- `Esc` - Clear selection or close modal

## Configuration

### Kanban Preferences (via `KanbanConfig`)
```typescript
interface KanbanConfig {
  render_markdown: boolean           // Enable rich text in cards
  include_archived_by_default: boolean // Show archived tasks
  default_tenant?: string            // Filter tasks by tenant
  lane_by_profile?: boolean          // Group by agent (future)
}
```

Stored in Hermes backend: `~/.hermes/kanban.db`

## Design Tokens (Aura Theme)

### Colors
- **Primary Action**: `#F97316` (Orange)
- **Hover State**: `#FB923C` (Amber)
- **Surface Dark**: `#191C21`
- **Border Dark**: `#2A2524`
- **Background**: `#0F1115` (dark) / `#FAF9F9` (light)

### Typography
- **Card Title**: Inter, 13px, font-weight 500
- **Metadata**: JetBrains Mono, 11px (assignee, project tags)
- **Display IDs**: Monospace, 600 weight

### Spacing
- **Card Padding**: 12px
- **Column Gap**: 16px
- **Card Border Radius**: 8px (`rounded-lg`)

## Integration Points

### Backend API Endpoints
- `GET /api/plugins/kanban/boards/{slug}?archived=false` - Load board tasks
- `PATCH /api/plugins/kanban/tasks/{id}/status` - Update task status
- `POST /api/plugins/kanban/run` - Dispatch agent execution
- `WebSocket /events?board={slug}` - Real-time updates

### State Management
```typescript
// App.tsx manages global state
const [tasks, setTasks] = useState<Task[]>([])
const [activeBoard, setActiveBoard] = useState<string>('default')

// Optimistic updates pattern
setTasks(prev => prev.map(t => 
  t.id === taskId ? { ...t, status: newStatus, updatedAt: 'Just now' } : t
))

// Sync to backend
await hermesApi.updateTaskStatus(taskId, newStatus, boardSlug)
```

## Error Handling

### Common Failure Scenarios
1. **Parent Task Blocking**: Backend returns 409 if parent tasks are incomplete
   - Error message: "Cannot move to ready: task has active parent dependencies"
   - Card reverts to previous column
   - Toast notification shows blocker details

2. **Invalid Transition**: Backend rejects illegal status changes
   - Example: Directly setting 'running' status
   - Funnels to run endpoint instead

3. **Network Failure**: Connection loss during update
   - Optimistic UI reverts to last known state
   - User notified via toast

## Performance Optimizations

1. **Debounced Updates**: 300ms delay on WebSocket events
2. **Memoized Filtering**: `useMemo` for column task grouping
3. **Virtualization Ready**: Component structure supports react-window if needed
4. **Event Batching**: Multiple task updates grouped into single render

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels on interactive elements
- High contrast mode compatible
- Screen reader announcements for status changes

## Future Enhancements
- Lane-by-profile view (group columns by agent)
- Custom column configuration
- Swimlanes for projects/priorities
- Collapsed column mode for large workflows
- Inline task editing
