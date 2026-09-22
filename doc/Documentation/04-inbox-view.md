# Inbox View (Human-in-the-Loop Review)

## Overview
Dedicated review center for human-in-the-loop (HITL) task approval, providing executive summaries and deliverable inspection before marking tasks as complete.

## Key Features

### 1. **Review Queue**
- Automatic filtering: Shows only tasks with status `review`
- Real-time count badge in sidebar
- Zero-state message when inbox empty
- Auto-refresh when new reviews arrive

### 2. **Card-Based Layout**
Each review card displays:
- **Task ID & Title**: Prominent heading
- **Assignee**: Agent that completed the work
- **Project Tag**: Board/workspace affiliation
- **Timestamp**: When review was submitted
- **Preview Snippet**: First 100 characters of report
- **Action Buttons**: Approve or Request Changes

### 3. **Dual-Tab Detail View**

#### Tab 1: Executive Summary
```
┌─────────────────────────────────────┐
│ 📊 Executive Summary                │
├─────────────────────────────────────┤
│ ## What Was Done                    │
│ - Implemented feature X             │
│ - Fixed bug Y                       │
│ - Updated documentation Z           │
│                                     │
│ ## Testing Results                  │
│ ✅ All tests passing                │
│ ✅ No regressions found             │
│                                     │
│ ## Deployment Notes                 │
│ Ready for production deployment     │
└─────────────────────────────────────┘
```

Features:
- **Markdown Rendering**: Full rich text support
- **Code Blocks**: Syntax-highlighted snippets
- **Collapsible Sections**: Long reports fold
- **Search/Filter**: Find keywords in report

#### Tab 2: Deliverables & Artifacts
Categorized file listing:
- **Terraform** (`.tf`, `.tfvars`) - Infrastructure code
- **Config/IaC** (`.yaml`, `.json`) - CloudFormation, Ansible
- **Documentation** (`.md`, `.txt`) - READMEs, specs
- **Diagrams** (`.svg`, `.png`) - Architecture visuals
- **Data** (`.csv`, `.sql`) - Database migrations, exports

Per-file actions:
- **👁️ Preview**: In-app code/image viewer
- **📥 Download**: Save file locally
- **📋 Copy Path**: Clipboard integration

### 4. **Review Actions**

#### Approve & Done
```typescript
const handleApprove = async (taskId: string) => {
  await onUpdateTaskStatus(taskId, 'done')
  // Card immediately removed from inbox
  // Agent credited for completion
}
```

Triggers:
- Task status → `done`
- Agent's done count increments
- Task archived (if configured)
- Notification sent to watchers (future)

#### Request Changes
```typescript
const handleRequestChanges = async (taskId: string, note?: string) => {
  // Attach revision comment
  if (note) {
    await hermesApi.addTaskComment(taskId, note)
  }
  // Return to implementer
  await onUpdateTaskStatus(taskId, 'ready')
  // Re-queues for agent pickup
}
```

Features:
- **Optional Comment**: Explain what needs fixing
- **Status Rollback**: Task returns to 'ready'
- **Assignee Preserved**: Original agent gets it back
- **Notification**: Agent sees revision request

### 5. **File Preview Modal**

#### Code Preview
```typescript
interface PreviewModal {
  filename: string
  language: string  // Auto-detected from extension
  content: string
  lineCount: number
}
```

Features:
- **Syntax Highlighting**: Prism.js for 200+ languages
- **Line Numbers**: Gutter with copyable references
- **Copy Button**: One-click content copy
- **Download**: Direct file download
- **Search**: Find in file (Ctrl+F)
- **Dark/Light Theme**: Follows system preference

#### Image Preview
- Full-size display with zoom
- SVG native rendering
- PNG/JPG optimization
- Architecture diagram annotations (future)

### 6. **Batch Review Operations**

#### Approve Multiple
```typescript
const handleBulkApprove = async (taskIds: string[]) => {
  for (const id of taskIds) {
    await onUpdateTaskStatus(id, 'done')
  }
  // All cards removed at once
}
```

Use case: Reviewing similar tasks (e.g., 10 documentation updates)

#### Filter by Assignee
```typescript
const filteredTasks = tasks.filter(t => 
  t.status === 'review' && 
  t.assigneeProfile === selectedAgent
)
```

Use case: Reviewing one agent's work before bulk approval

## Technical Implementation

### Component: `InboxView.tsx`
```typescript
interface InboxViewProps {
  tasks: Task[]
  onApproveTask: (taskId: string) => void
  onRequestChanges: (taskId: string, note?: string) => void
  onSendComment: (taskId: string, note: string) => Promise<boolean>
  onRefreshTasks: () => void
}
```

### Review Queue Logic
```typescript
// Filter tasks in 'review' status
const reviewTasks = tasks.filter(t => t.status === 'review')

// Sort by priority and age
const sortedReviews = reviewTasks.sort((a, b) => {
  if (a.priority !== b.priority) {
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  }
  return new Date(b.updatedAt) - new Date(a.updatedAt)
})
```

### Card Component
```typescript
const ReviewCard: React.FC<{ task: Task }> = ({ task }) => {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'files'>('summary')
  
  return (
    <div className="review-card">
      <header onClick={() => setExpanded(!expanded)}>
        {/* Task metadata */}
      </header>
      
      {expanded && (
        <div className="review-content">
          <nav>
            <button onClick={() => setActiveTab('summary')}>Summary</button>
            <button onClick={() => setActiveTab('files')}>Deliverables</button>
          </nav>
          
          {activeTab === 'summary' ? (
            <MarkdownRenderer content={task.reviewReport} />
          ) : (
            <FileList attachments={attachments} />
          )}
          
          <footer>
            <button onClick={() => onApprove(task.id)}>✅ Approve</button>
            <button onClick={() => openChangeRequest()}>🔁 Request Changes</button>
          </footer>
        </div>
      )}
    </div>
  )
}
```

### File Preview Loading
```typescript
const loadAttachments = async (taskId: string) => {
  const details = await hermesApi.getTaskDetails(taskId)
  return details.attachments || []
}

const downloadFile = async (attachmentId: number) => {
  const blob = await hermesApi.downloadAttachment(attachmentId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
```

## User Interactions

### Reviewing a Task
1. **Click Review Card**: Expands full detail view
2. **Read Summary Tab**: Review agent's report
3. **Check Files Tab**: Inspect deliverables
4. **Preview Code**: Click 👁️ on any file
5. **Make Decision**: Approve or request changes

### Requesting Changes
1. Click "🔁 Request Changes"
2. Modal appears with comment field
3. Explain what needs fixing (optional but recommended)
4. Submit → Task returns to 'ready' status
5. Original agent will re-process it

### Bulk Approval Workflow
1. Review 3-5 similar tasks
2. All look good
3. Select checkboxes on cards (future feature)
4. Click "Approve All Selected"
5. Inbox cleared instantly

## Design Tokens (Aura Theme)

### Review Card Styling
```css
.review-card {
  background: #191C21;
  border: 1px solid #2A2524;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  transition: all 200ms ease;
}

.review-card:hover {
  border-color: #F97316;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.15);
  transform: translateY(-1px);
}

.review-card.expanded {
  border-color: #F97316;
  background: #1A1D23;
}
```

### Action Buttons
```css
/* Approve button */
.btn-approve {
  background: #10B981;
  color: white;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
}

.btn-approve:hover {
  background: #059669;
}

/* Request changes button */
.btn-request-changes {
  background: transparent;
  border: 1px solid #F97316;
  color: #F97316;
  font-weight: 600;
  padding: 10px 20px;
  border-radius: 8px;
}

.btn-request-changes:hover {
  background: rgba(249, 115, 22, 0.1);
}
```

### Typography
- **Card Title**: Inter, 15px, font-weight 600
- **Metadata**: JetBrains Mono, 11px
- **Report Body**: Geist, 14px, line-height 1.6

## Integration Points

### Backend API Endpoints
```typescript
// Get review queue
GET /api/plugins/kanban/tasks?status=review&board={slug}

// Get task details with attachments
GET /api/plugins/kanban/tasks/{id}/details

// Approve (transition to done)
PATCH /api/plugins/kanban/tasks/{id}/status
{ "status": "done" }

// Request changes (transition to ready + comment)
POST /api/plugins/kanban/tasks/{id}/comments
{ "body": "Please fix X" }
PATCH /api/plugins/kanban/tasks/{id}/status
{ "status": "ready" }

// Download file
GET /api/plugins/kanban/attachments/{id}/download
```

### Real-time Updates
```typescript
// WebSocket events for new reviews
hermesApi.connectEvents((event) => {
  if (event.type === 'task.status_changed' && event.status === 'review') {
    // Add to inbox
    playNotificationSound()
    showDesktopNotification('New review ready')
  }
})
```

## Keyboard Shortcuts
- `I` - Jump to Inbox view
- `↓ / ↑` - Navigate between review cards
- `Space` - Expand/collapse current card
- `A` - Approve current task
- `R` - Request changes
- `Esc` - Close expanded card

## Performance Characteristics

### Review Queue Loading
- Query filtered at database level (`WHERE status = 'review'`)
- Typical response time: <50ms for 100 tasks
- Attachments loaded lazily (only when preview clicked)

### Markdown Rendering
- Memoized per task (doesn't re-render unless report changes)
- Syntax highlighting cached by Prism.js
- Large reports (>10KB) show "Show more" fold

## Accessibility

- **Semantic HTML**: `<article>` for cards, `<nav>` for tabs
- **ARIA Labels**: "Approve task X", "Request changes for Y"
- **Keyboard Navigation**: Full support without mouse
- **Screen Reader**: Announces task count, status changes
- **High Contrast**: Clear borders and focus indicators

## Error Handling

### Approval Failure
```typescript
try {
  await onApproveTask(taskId)
} catch (err) {
  // Card stays in inbox
  pushToast('error', 'Could not approve task', err.message)
  // Allow retry
}
```

### Attachment Download Failure
```typescript
try {
  await downloadFile(attachmentId)
} catch (err) {
  pushToast('error', 'Download failed', 'Try again or contact support')
}
```

## Metrics & Analytics

### Review Velocity
Track in Hermes backend:
- Average time in review queue
- Approval rate vs. change requests
- Reviewer response time
- Busiest review hours

### Agent Performance
Per-agent metrics:
- First-pass approval rate
- Average revision cycles
- Most common change request reasons

## Best Practices

### For Reviewers
1. **Read Summary First**: Get context before diving into code
2. **Check Tests**: Verify test results in report
3. **Spot-Check Files**: Don't need to read every line
4. **Be Specific**: If requesting changes, explain clearly
5. **Approve Fast**: Don't block good work unnecessarily

### For Agents (via prompts)
1. **Write Clear Summaries**: Explain what was done and why
2. **Include Test Results**: Show all tests passed
3. **Highlight Risks**: Call out anything unusual
4. **Attach Evidence**: Include relevant files
5. **Format Well**: Use markdown for readability

## Future Enhancements
- Multi-reviewer assignment
- Review checklists (security, performance, tests)
- Inline code annotations
- Diff view comparing before/after
- Video walkthroughs attached to reviews
- Review time tracking
- Approval delegation rules
- Auto-approve for low-risk changes
- Review templates by task type
- Integration with Slack/Teams for notifications
