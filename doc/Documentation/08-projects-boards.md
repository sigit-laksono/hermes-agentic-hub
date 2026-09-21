# Projects & Boards Management

## Overview
Multi-workspace project management system allowing users to organize tasks across different boards with dedicated working directories and team assignments.

## Key Features

### 1. **Board Structure**
```typescript
interface Board {
  slug: string              // Unique identifier (e.g., "infrastructure")
  name: string              // Display name ("Infrastructure Team")
  description: string       // Purpose and scope
  default_workdir?: string  // File system path (e.g., "/home/user/infra")
  is_current: boolean       // Active workspace flag
  counts?: {                // Task statistics
    triage: number
    todo: number
    ready: number
    running: number
    review: number
    done: number
  }
  total: number            // Total task count
  created_at?: number
  updated_at?: number
}
```

### 2. **Projects View Layout**

#### Grid Display
```
┌─────────────────────────────────────────────────────────┐
│ 📂 Projects & Workspaces                    [+ New]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ 🏗️ Infrastructure│  │ 📱 Mobile App    │           │
│  │ Active           │  │ Active           │           │
│  ├──────────────────┤  ├──────────────────┤           │
│  │ 12 tasks         │  │ 8 tasks          │           │
│  │ 8 done / 12      │  │ 5 done / 8       │           │
│  │                  │  │                  │           │
│  │ sa-aws           │  │ default          │           │
│  │ 👤 Lead          │  │ 👤 Lead          │           │
│  │                  │  │                  │           │
│  │ ~/infra/         │  │ ~/mobile-app/    │           │
│  │ [Open] [⚙️]      │  │ [Open] [⚙️]      │           │
│  └──────────────────┘  └──────────────────┘           │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐           │
│  │ 📊 Analytics     │  │ 🔐 Security      │           │
│  │ Active           │  │ Paused           │           │
│  └──────────────────┘  └──────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

#### Project Card Components
- **Header**: Icon + Name + Status badge
- **Progress Bar**: Visual completion percentage
- **Statistics**: Done/Total task count
- **Lead Avatar**: Primary responsible person/agent
- **Working Directory**: File system path
- **Actions**: Open board, Configure settings

### 3. **Creating New Projects**

#### Creation Modal
```typescript
interface CreateProjectPayload {
  slug: string              // URL-safe identifier
  name: string              // Display name
  description: string       // Project purpose
  default_workdir?: string  // Optional workspace path
  switch?: boolean          // Immediately switch to new board
}
```

Form interface:
```
┌─────────────────────────────────────┐
│ Create New Project                  │
├─────────────────────────────────────┤
│ Project Name:                       │
│ [Frontend Redesign____________]     │
│                                     │
│ Slug (auto-generated):              │
│ [frontend-redesign____________]     │
│                                     │
│ Description:                        │
│ ┌─────────────────────────────────┐ │
│ │Complete UI/UX redesign for      │ │
│ │customer dashboard using React   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Working Directory (optional):       │
│ [~/projects/frontend-redesign__]    │
│ [📁 Browse]                         │
│                                     │
│ ☑ Switch to this project after      │
│   creation                          │
│                                     │
│ [Cancel] [Create Project]           │
└─────────────────────────────────────┘
```

Validation rules:
- **Name**: 1-100 characters, required
- **Slug**: Auto-generated from name, lowercase, hyphens only
- **Description**: Optional, markdown supported
- **Working Directory**: Must be valid absolute path

### 4. **Board Switching**

#### Header Dropdown
```
┌────────────────────────────────────┐
│ Current Board: Infrastructure   [▼]│
├────────────────────────────────────┤
│ 📍 Infrastructure (12 tasks)       │  ← Current
│ 📱 Mobile App (8 tasks)            │
│ 📊 Analytics (4 tasks)             │
│ 🔐 Security (0 tasks)              │
│ ──────────────────────────────────│
│ ➕ New Project                     │
└────────────────────────────────────┘
```

Switching behavior:
1. Save current board state to localStorage
2. Update URL query param: `?board=infrastructure`
3. Fetch new board's tasks from backend
4. Update header stats
5. Preserve view mode (board/table)
6. Clear multi-select state

#### Quick Switch
- Click board name in header
- Select from dropdown
- Instant context switch
- No page reload

### 5. **Board Statistics**

#### Real-time Metrics
```typescript
interface BoardStats {
  total: number                      // Total tasks
  byStatus: Record<TaskStatus, number>
  activeWorkers: number              // Running agents
  oldestReadyAgeSeconds?: number     // Oldest task in ready
  oldestReadyAgeFormatted?: string   // "5m 23s"
}
```

Displayed in header:
```
Infrastructure | 12 tasks | ⚡ 2 workers | 🕐 Oldest: 5m 23s
```

#### Progress Tracking
```
Project Card:
┌────────────────────┐
│ Progress           │
│ [████████░░] 67%   │
│ 8 done / 12 total  │
└────────────────────┘
```

Calculation:
```typescript
const progressPercent = (counts.done / total) * 100
```

### 6. **Working Directory Integration**

#### Purpose
Associates each board with a file system location where:
- Agent executes commands
- Files are read/written
- Git operations run
- Builds/tests execute

#### Configuration
```yaml
# ~/.hermes/boards/infrastructure.yaml
slug: infrastructure
name: Infrastructure Team
default_workdir: /home/user/infrastructure
description: AWS and Azure cloud infrastructure
```

#### Agent Execution Context
```bash
# When agent runs task from "infrastructure" board
cd /home/user/infrastructure
git status  # Executes in board's working directory
terraform plan
```

Benefits:
- Isolated workspaces per project
- No accidental cross-project changes
- Clear separation of concerns
- Easy to reason about file locations

### 7. **Board Management Actions**

#### Open Board
```typescript
const handleSelectProject = (slug: string) => {
  setActiveBoard(slug)
  setActiveTab('my_issues')      // Navigate to Kanban
  loadLiveData(slug)             // Fetch board tasks
}
```

Effect:
- Switches active board
- Loads board's tasks
- Updates URL
- Refreshes statistics

#### Archive Board
- Mark board as archived (not implemented yet)
- Hide from active list
- Preserve all tasks and history
- Can be restored later

#### Delete Board
- Permanently remove board
- Requires confirmation
- Optionally delete all tasks
- Cannot be undone

#### Export Board
```typescript
// Export board data
GET /api/plugins/kanban/boards/{slug}/export

// Returns JSON
{
  "board": { ... },
  "tasks": [ ... ],
  "comments": [ ... ],
  "attachments": [ ... ]
}
```

Use cases:
- Backup before major changes
- Migrate to another instance
- Share board template
- Analytics/reporting

### 8. **Default Board**

#### Special "default" Board
```typescript
const defaultBoard: Board = {
  slug: 'default',
  name: 'Default Workspace',
  description: 'General-purpose workspace for miscellaneous tasks',
  is_current: true,
  counts: { /* ... */ },
  total: 0
}
```

Characteristics:
- Always exists, cannot be deleted
- Fallback when no board specified
- No specific working directory
- Suitable for quick tasks

### 9. **Board Filtering & Search**

#### Filter Projects
```typescript
const filteredProjects = projects.filter(p => {
  if (statusFilter === 'active') return p.status === 'active'
  if (statusFilter === 'archived') return p.status === 'archived'
  if (searchQuery) return p.name.toLowerCase().includes(searchQuery.toLowerCase())
  return true
})
```

Filters:
- **Status**: Active / Archived / All
- **Search**: Name or description match
- **Lead**: Filter by assigned lead

#### Sort Options
```typescript
const sortedProjects = projects.sort((a, b) => {
  switch (sortBy) {
    case 'name': return a.name.localeCompare(b.name)
    case 'tasks': return b.total - a.total
    case 'progress': return calculateProgress(b) - calculateProgress(a)
    case 'updated': return b.updated_at - a.updated_at
    default: return 0
  }
})
```

## Technical Implementation

### Component: `ProjectsView.tsx`
```typescript
interface ProjectsViewProps {
  projects: Board[]
  activeBoard: string
  onSelectProject: (slug: string) => void
  onNewProject: () => void
  onRefreshProjects: () => void
}
```

### Data Loading
```typescript
// Load all boards
const loadBoards = async () => {
  const liveBoards = await hermesApi.getBoards()
  setBoards(liveBoards)
  
  // Transform to Project interface for UI
  setProjects(liveBoards.map(b => ({
    id: b.slug,
    slug: b.slug,
    name: b.name,
    status: 'active',
    priority: 'medium',
    progressDone: b.counts?.done || 0,
    progressTotal: b.total || 0,
    lead: 'Workspace Owner',
    leadAvatar: '👤',
    createdAt: 'Active',
    description: b.description || '',
    default_workdir: b.default_workdir,
    is_current: b.is_current
  })))
}
```

### Board Creation
```typescript
const handleCreateProject = async (params: {
  slug: string
  name: string
  description: string
  default_workdir?: string
  switch?: boolean
}) => {
  const ok = await hermesApi.createBoard(params)
  
  if (ok) {
    if (params.switch) {
      setActiveBoard(params.slug)
      loadLiveData(params.slug)
    } else {
      loadLiveData(activeBoard)  // Refresh current board
    }
  }
  
  return ok
}
```

### URL Synchronization
```typescript
// Read board from URL on mount
const urlParams = new URLSearchParams(window.location.search)
const urlBoard = urlParams.get('board')
if (urlBoard) {
  setActiveBoard(urlBoard)
}

// Update URL when board changes
useEffect(() => {
  const url = new URL(window.location.href)
  if (activeBoard === 'default') {
    url.searchParams.delete('board')
  } else {
    url.searchParams.set('board', activeBoard)
  }
  window.history.replaceState({}, '', url.toString())
}, [activeBoard])
```

## User Interactions

### Browsing Projects
1. Click "Projects" in sidebar
2. View grid of all boards
3. Scroll to see all
4. Click card to open board

### Creating Project
1. Click "+ New" button
2. Fill in form fields
3. Optionally set working directory
4. Choose whether to switch immediately
5. Submit

### Switching Boards
1. Click current board name in header
2. Select from dropdown
3. Board switches instantly
4. Tasks reload automatically

## Design Tokens (Aura Theme)

### Project Card
```css
.project-card {
  background: #191C21;
  border: 1px solid #2A2524;
  border-radius: 16px;
  padding: 20px;
  width: 280px;
  height: 220px;
  transition: all 200ms ease;
}

.project-card:hover {
  border-color: #F97316;
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(249, 115, 22, 0.2);
}

.project-card.is-current {
  border-color: #F97316;
  border-width: 2px;
}
```

### Progress Bar
```css
.progress-bar {
  width: 100%;
  height: 6px;
  background: #2A2524;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #F97316, #FB923C);
  transition: width 300ms ease;
}
```

### Typography
- **Project Name**: Inter, 16px, font-weight 600
- **Statistics**: JetBrains Mono, 13px
- **Description**: Geist, 13px, line-height 1.5

## Integration Points

### Backend API Endpoints
```typescript
// List all boards
GET /api/plugins/kanban/boards

// Get single board with tasks
GET /api/plugins/kanban/boards/{slug}?archived=false

// Create board
POST /api/plugins/kanban/boards
{
  "slug": "infrastructure",
  "name": "Infrastructure Team",
  "description": "AWS and Azure cloud",
  "default_workdir": "/home/user/infra"
}

// Update board
PUT /api/plugins/kanban/boards/{slug}
{ "name": "Updated Name", ... }

// Delete board
DELETE /api/plugins/kanban/boards/{slug}
```

## Performance Characteristics

- Loads all boards once on app start
- Cached for session duration
- Refresh triggered manually or via WebSocket
- Typical response time: <100ms for 50 boards

## Accessibility

- Grid layout with proper focus management
- Keyboard navigation (arrow keys)
- Screen reader announces board stats
- High contrast card borders

## Future Enhancements
- Board templates (clone existing board)
- Board sharing (invite collaborators)
- Access control (read-only, write, admin)
- Board tags/categories
- Favorite boards (pin to top)
- Recently viewed boards
- Board activity feed
- Workspace-level settings
- Sub-boards (hierarchical structure)
- Board import/export
