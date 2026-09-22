# Bulk Operations

## Overview
Powerful multi-select and batch operation system for managing multiple tasks simultaneously, accessible via floating toolbar when tasks are selected.

## Key Features

### 1. **Multi-Select Interface**
- **Checkbox Selection**: Click checkbox on any card/row to select
- **Visual Feedback**: Orange border on selected items
- **Selection Count**: Badge shows "N selected"
- **Cross-View**: Selection persists between Board/Table views

### 2. **Floating Action Toolbar**
```
┌──────────────────────────────────────────────────────────────┐
│ 🎯 3 selected | [Status ▼] [Assignee ▼] [Priority ▼] [Archive] [✕] │
└──────────────────────────────────────────────────────────────┘
```

Position: Fixed bottom-center, appears only when `selectedTaskIds.size > 0`

### 3. **Batch Operations**

#### Change Status
```typescript
handleBulkStatusChange(newStatus: TaskStatus)
```

Available transitions:
- **Triage** - Park for later triage
- **Todo** - Add to backlog
- **Ready** - Queue for agent pickup
- **Review** - Send to human review
- **Done** - Mark as complete
- **Archived** - Hide from active views

Behavior:
- Optimistic UI update (all cards move immediately)
- Backend batch API call
- Partial failures reported (some succeed, some fail)
- Failed tasks revert to original status

#### Reassign Agent
```typescript
handleBulkAssigneeChange(agentId: string)
```

Features:
- Dropdown shows all available agents
- Agent avatar + name display
- Preserves priority and status
- Updates all cards atomically

Use cases:
- Load balancing across agents
- Specialization (move all DB tasks to `database-engineer`)
- Vacation coverage (reassign while agent offline)

#### Change Priority
```typescript
handleBulkPriorityChange(priority: Priority)
```

Options:
- 🔴 **Urgent** - Critical, drop everything
- 🟠 **High** - Important, prioritize
- 🔵 **Medium** - Normal priority
- ⚪ **Low** - Nice to have

Effect:
- Visual badge updates on all cards
- Backend persists new priority
- Does not auto-reorder tasks (manual drag still works)

#### Archive Tasks
```typescript
handleBulkArchive()
```

Behavior:
- Cards removed from active view
- Status changed to `archived`
- Still accessible via "Show Archived" filter
- Can be restored later

Confirmation:
- No confirmation for <5 tasks
- Confirmation dialog for 5+ tasks
- Shows task IDs being archived

### 4. **Error Handling & Partial Failures**

#### Partial Success Reporting
```typescript
interface BulkUpdateResult {
  success: boolean
  results: Array<{
    task_id: string
    success: boolean
    error?: string
  }>
}
```

Visual feedback:
```
⚠️ 2 tasks could not be updated:
- #663b67e: Cannot move to ready (blocked by parent task)
- #7a8c9f1: Permission denied
```

Error banner appears above toolbar with:
- List of failed tasks
- Specific error reason per task
- Dismiss button
- Retry option (future)

#### Conflict Resolution
When backend rejects some updates:
1. Successful tasks remain updated
2. Failed tasks revert to previous state
3. Error details shown in banner
4. Selection cleared after user dismisses errors

### 5. **Selection Management**

#### Select All
```typescript
handleSelectAllTasks(taskIds: string[])
```

Triggered by:
- Header checkbox in Table View
- Keyboard: `Ctrl/Cmd + A`
- Selects all visible tasks (respects filters)

#### Clear Selection
```typescript
handleClearSelection()
```

Triggered by:
- ✕ button in toolbar
- Keyboard: `Esc`
- After successful bulk operation
- Clears selection + error banner

#### Intelligent Selection
- Excludes archived tasks by default
- Respects current filter/search
- Works across pagination (future)

## Technical Implementation

### Component: `BulkActionToolbar.tsx`
```typescript
interface BulkActionToolbarProps {
  selectedCount: number
  agents: AIAgent[]
  onClearSelection: () => void
  onBulkStatusChange: (status: TaskStatus) => void
  onBulkAssigneeChange: (agentId: string) => void
  onBulkPriorityChange: (priority: Priority) => void
  onBulkArchive: () => void
  partialErrors: Array<{ taskId: string; error: string }>
  onDismissErrors: () => void
}
```

### State Management (App.tsx)
```typescript
// Selection state
const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())

// Error tracking
const [bulkPartialErrors, setBulkPartialErrors] = useState<Array<{
  taskId: string
  error: string
}>>([])

// Toggle selection
const handleToggleSelectTask = (taskId: string) => {
  setSelectedTaskIds(prev => {
    const next = new Set(prev)
    if (next.has(taskId)) {
      next.delete(taskId)
    } else {
      next.add(taskId)
    }
    return next
  })
}
```

### Backend API Call
```typescript
// Batch update endpoint
POST /api/plugins/kanban/bulk-update
{
  "task_ids": ["t_663b67e", "t_7a8c9f1", "t_abc123"],
  "updates": {
    "status": "ready",
    // OR
    "assignee": "sa-aws",
    // OR
    "priority": 2,
    // OR
    "archive": true
  },
  "board": "default"
}

// Response
{
  "results": [
    { "task_id": "t_663b67e", "success": true },
    { "task_id": "t_7a8c9f1", "success": false, "error": "Blocked by parent" },
    { "task_id": "t_abc123", "success": true }
  ]
}
```

### Optimistic Update Pattern
```typescript
const handleBulkStatusChange = async (newStatus: TaskStatus) => {
  const ids = Array.from(selectedTaskIds)
  
  // 1. Optimistic UI update
  setTasks(prev =>
    prev.map(t => 
      selectedTaskIds.has(t.id) 
        ? { ...t, status: newStatus, updatedAt: 'Just now' } 
        : t
    )
  )
  
  // 2. Backend sync
  try {
    const res = await hermesApi.bulkUpdateTasks(liveIds, { status: newStatus }, activeBoard)
    
    // 3. Handle partial failures
    if (res.results) {
      const failures = res.results
        .filter(r => !r.success)
        .map(r => ({ taskId: r.task_id, error: r.error || 'Failed' }))
      
      if (failures.length > 0) {
        setBulkPartialErrors(failures)
        // Revert failed tasks
        loadLiveData(activeBoard)
      }
    }
  } catch (err) {
    // Complete failure - revert all
    setBulkPartialErrors([{ taskId: 'Bulk operation', error: err.message }])
    loadLiveData(activeBoard)
  }
  
  // 4. Clear selection on success
  setSelectedTaskIds(new Set())
}
```

## User Interactions

### Selecting Tasks
1. **Individual**: Click checkbox on card/row
2. **Multiple**: Click checkboxes on multiple tasks
3. **All**: Press `Ctrl/Cmd + A` or click header checkbox
4. **Range**: Shift+Click (future enhancement)

### Performing Bulk Operation
1. Select 2+ tasks
2. Toolbar appears at bottom
3. Choose operation from dropdown
4. Select new value (status/assignee/priority)
5. Operation executes immediately
6. Success: Selection clears, toolbar hides
7. Partial failure: Error banner shows, selection preserved

### Handling Errors
1. Error banner appears above toolbar
2. Read which tasks failed and why
3. Options:
   - Fix underlying issue (e.g., complete parent task)
   - Deselect failed tasks, retry operation
   - Dismiss and handle manually
4. Click ✕ to dismiss banner

## Design Tokens (Aura Theme)

### Toolbar Styling
```css
.bulk-action-toolbar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  
  background: #191C21;
  border: 2px solid #F97316;
  border-radius: 12px;
  padding: 12px 20px;
  
  box-shadow: 0 10px 40px rgba(249, 115, 22, 0.25);
  backdrop-filter: blur(10px);
}
```

### Selection Badge
```css
.selection-count {
  background: #F97316;
  color: white;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
  margin-right: 16px;
}
```

### Error Banner
```css
.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #EF4444;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  
  color: #FCA5A5;
  font-size: 13px;
}

.error-list {
  margin-top: 8px;
  padding-left: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}
```

## Keyboard Shortcuts
- `Ctrl/Cmd + A` - Select all visible tasks
- `Esc` - Clear selection and dismiss errors
- `Delete` - Archive selected (with confirmation)
- `S` - Open status dropdown (future)
- `A` - Open assignee dropdown (future)
- `P` - Open priority dropdown (future)

## Performance Characteristics

### Selection State
- `Set<string>` for O(1) membership checks
- No array iteration on toggle
- Memoized selection predicates

### Batch Operations
- Backend processes updates in transaction
- Typical throughput: 50 tasks/second
- Timeout: 30 seconds for large batches
- Progress indicator for 50+ tasks (future)

### UI Responsiveness
- Optimistic updates render instantly (<16ms)
- Backend sync happens asynchronously
- No UI blocking during operation
- Toast notifications for completion

## Integration Points

### Backend API
```typescript
// hermesApi.ts
export async function bulkUpdateTasks(
  taskIds: string[],
  updates: Partial<{
    status: TaskStatus
    assignee: string
    priority: number
    archive: boolean
  }>,
  board: string
): Promise<BulkUpdateResult>
```

### State Synchronization
```typescript
// After bulk operation
setTimeout(() => loadLiveData(activeBoard), 600)
// Ensures backend state is authoritative
// Catches any missed updates or conflicts
```

## Accessibility

- **Focus Management**: Toolbar receives focus when appearing
- **Keyboard Navigation**: Tab through all controls
- **ARIA Announcements**: "3 tasks selected", "Operation complete"
- **Screen Reader**: Reads error messages aloud
- **High Contrast**: Clear borders and text

## Error Scenarios & Recovery

### Scenario 1: Parent Task Blocking
```
Error: Cannot move to ready (blocked by parent task #abc123)
Recovery: 
1. Complete parent task first
2. Or remove parent link
3. Retry bulk operation
```

### Scenario 2: Permission Denied
```
Error: User lacks permission to modify task #xyz789
Recovery:
1. Contact workspace admin
2. Or deselect restricted task
3. Retry with remaining tasks
```

### Scenario 3: Network Timeout
```
Error: Request timeout after 30 seconds
Recovery:
1. Check network connection
2. Reduce batch size (<50 tasks)
3. Retry operation
```

### Scenario 4: Invalid State Transition
```
Error: Cannot transition from 'done' to 'todo'
Recovery:
1. Review task status rules
2. Select different target status
3. Or handle tasks individually
```

## Best Practices

### For Users
1. **Select Wisely**: Review selection before operating
2. **Start Small**: Test with 2-3 tasks first
3. **Check Errors**: Always read failure messages
4. **Batch Strategically**: Group similar tasks for efficiency

### For Administrators
1. **Configure Limits**: Set max batch size per user
2. **Monitor Usage**: Track bulk operation patterns
3. **Audit Trail**: Log all bulk changes
4. **Rate Limiting**: Prevent abuse

## Metrics & Analytics

Track in Hermes backend:
- Bulk operations per user/day
- Average batch size
- Success vs. failure rate
- Most common error types
- Time saved vs. individual updates

## Future Enhancements
- **Range Selection**: Shift+Click to select range
- **Smart Filters**: "Select all high priority"
- **Undo**: Revert last bulk operation
- **Templates**: Save common bulk operations
- **Progress Bar**: For 100+ task batches
- **Dry Run**: Preview changes before applying
- **Scheduled Bulk**: Queue operations for later
- **Conditional Updates**: "If status=X, then set Y"
- **Bulk Edit Mode**: Dedicated full-screen view
- **Export Selection**: Save selected tasks as CSV
