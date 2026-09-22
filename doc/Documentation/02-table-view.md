# Table View

## Overview
Spreadsheet-style task management interface providing dense information display and powerful multi-select capabilities, complementing the Kanban board view.

## Key Features

### 1. **Dense Data Display**
- Compact row-based layout showing all tasks at once
- Horizontal scrolling for extended columns
- Sortable columns (future enhancement)
- Resizable columns (future enhancement)

### 2. **Column Structure**
| Column | Width | Content |
|--------|-------|---------|
| **Checkbox** | 40px | Multi-select control |
| **ID** | 100px | Display ID with clickable link |
| **Title** | flex-1 | Task title with truncation |
| **Status** | 120px | Status badge dropdown |
| **Priority** | 100px | Priority indicator |
| **Assignee** | 140px | Agent avatar + name |
| **Project** | 140px | Board/workspace tag |
| **Updated** | 100px | Last modified timestamp |
| **Actions** | 80px | Quick action buttons |

### 3. **Interactive Elements**

#### Status Dropdown
```typescript
// Click status badge to change
<select 
  value={task.status}
  onChange={(e) => onUpdateTaskStatus(task.id, e.target.value)}
  className="status-select"
>
  <option value="triage">🎯 Triage</option>
  <option value="todo">📋 Todo</option>
  <option value="ready">✅ Ready</option>
  <option value="running">⚡ Running</option>
  <option value="review">👁️ Review</option>
  <option value="done">✓ Done</option>
</select>
```

#### Priority Icons
- 🔴 **Urgent** - Red circle badge
- 🟠 **High** - Orange circle badge
- 🔵 **Medium** - Blue circle badge
- ⚪ **Low/None** - Gray circle badge

### 4. **Multi-Select Operations**
- **Header Checkbox**: Select/deselect all visible tasks
- **Row Checkbox**: Individual task selection
- **Visual Feedback**: Orange border on selected rows
- **Count Badge**: Shows "N selected" in toolbar

### 5. **Row Actions**
Each row has quick action menu:
- **▶ Run** - Execute agent immediately
- **💬 Comment** - Add note/feedback
- **👁️ View** - Open detail modal
- **🗑️ Delete** - Remove task (with confirmation)

### 6. **Responsive Layout**
- Horizontal scroll on smaller screens
- Sticky header row
- Sticky checkbox column (future)
- Minimum column widths enforced

## Technical Implementation

### Component: `TableView.tsx`
```typescript
interface TableViewProps {
  tasks: Task[]
  agents: AIAgent[]
  activeBoard: string
  activeBoardName: string
  kanbanConfig: KanbanConfig
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void
  onOpenNewIssue: (status?: TaskStatus) => void
  onRunAgent: (taskId: string) => void
  onSendComment: (taskId: string, note: string) => Promise<boolean>
  onRefreshTasks: () => void
  onDeleteTask: (taskId: string) => Promise<boolean>
  selectedTaskIds: Set<string>
  onToggleSelect: (taskId: string) => void
  onSelectAll: (taskIds: string[]) => void
}
```

### Select All Logic
```typescript
const handleSelectAll = () => {
  if (selectedTaskIds.size === tasks.length) {
    onSelectAll([]) // Deselect all
  } else {
    onSelectAll(tasks.map(t => t.id)) // Select all
  }
}
```

### Row Rendering Performance
```typescript
// Memoized row component to prevent unnecessary re-renders
const TaskRow = React.memo(({ task, isSelected, onToggle }) => {
  return (
    <tr className={clsx(
      'table-row',
      isSelected && 'border-2 border-orange-500 bg-orange-500/5'
    )}>
      {/* Row content */}
    </tr>
  )
})
```

## User Interactions

### Switching to Table View
1. **Header Toggle**: Click "Table" button in header
2. **Keyboard**: Press `T` key
3. View persists in session state

### Selecting Tasks
1. **Individual**: Click checkbox in any row
2. **All**: Click header checkbox
3. **Range**: Shift+Click (future enhancement)
4. **Keyboard**: `Ctrl/Cmd + A` selects all

### Bulk Operations
After selection, use floating toolbar for:
- Status change (all selected)
- Assignee reassignment
- Priority update
- Archive/delete

### Inline Editing
- **Status**: Click badge, select from dropdown
- **Other Fields**: Opens detail modal (future: inline edit)

## Design Tokens (Aura Theme)

### Table Styling
```css
/* Header */
.table-header {
  background: #191C21;
  border-bottom: 1px solid #2A2524;
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9CA3AF;
}

/* Rows */
.table-row {
  border-bottom: 1px solid #2A2524;
  transition: background-color 150ms ease;
}

.table-row:hover {
  background: rgba(249, 115, 22, 0.05);
}

/* Selected state */
.table-row.selected {
  border: 2px solid #F97316;
  background: rgba(249, 115, 22, 0.08);
}
```

### Typography
- **Headers**: JetBrains Mono, 11px, uppercase, tracking-wide
- **Cell Text**: Inter, 13px, normal weight
- **IDs**: JetBrains Mono, 12px, font-weight 600

## Keyboard Shortcuts
- `T` - Switch to Table view
- `Ctrl/Cmd + A` - Select all tasks
- `Esc` - Clear selection
- `Enter` on row - Open detail modal (future)
- Arrow keys - Navigate rows (future)

## Comparison: Table vs. Kanban

| Aspect | Table View | Kanban Board |
|--------|-----------|--------------|
| **Information Density** | High (all data visible) | Medium (focused cards) |
| **Multi-Select** | Easy (checkboxes) | Manual (click each card) |
| **Status Changes** | Dropdown | Drag-and-drop |
| **Sorting/Filtering** | Built-in column sort | Manual grouping |
| **Use Case** | Bulk operations, data review | Visual workflow, priority view |
| **Screen Space** | Vertical scroll | Horizontal + vertical |

## Performance Characteristics

### Rendering Optimization
- Memoized row components
- Virtualized scrolling for 500+ tasks (via `react-window`)
- Debounced selection state updates

### Data Loading
- Same backend query as Kanban
- No additional API calls
- Instant view switching (shared state)

## Integration Points

### Shared State with Kanban
```typescript
// App.tsx view mode toggle
const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

// Both views consume same data
{viewMode === 'board' ? (
  <KanbanBoard tasks={tasks} ... />
) : (
  <TableView tasks={tasks} ... />
)}
```

### Bulk Operations Integration
- Selection state managed in `App.tsx`
- `BulkActionToolbar` appears when `selectedTaskIds.size > 0`
- Both views share same selection state

## Accessibility

- Semantic `<table>` structure
- ARIA labels on checkboxes
- Keyboard navigation support
- Screen reader friendly
- High contrast mode compatible

## Error Handling

### Status Update Failures
```typescript
try {
  await onUpdateTaskStatus(task.id, newStatus)
} catch (err) {
  // Revert dropdown to previous value
  // Show toast notification
  pushToast('error', 'Status update failed', err.message)
}
```

### Delete Confirmation
```typescript
const handleDelete = async (taskId: string) => {
  if (!confirm('Delete this task permanently?')) return
  
  const success = await onDeleteTask(taskId)
  if (success) {
    pushToast('success', 'Task deleted')
  }
}
```

## Future Enhancements
- Column sorting (click header to sort)
- Column resizing (drag header borders)
- Column visibility toggles
- Sticky first column (ID/checkbox)
- Row grouping by assignee/project
- Inline cell editing (double-click)
- Export to CSV/Excel
- Custom column configuration
- Saved table views/filters
- Keyboard-only navigation (vim-style)
