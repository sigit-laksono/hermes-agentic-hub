# Global Search (Quick Find)

## Overview
Universal search interface accessible via keyboard shortcut, providing instant access to tasks, projects, agents, skills, and navigation actions.

## Key Features

### 1. **Quick Access**
- **Keyboard Shortcut**: `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)
- **Always Available**: Works from any view, even with modals open
- **Instant Results**: Real-time filtering as you type
- **Zero Config**: Pre-indexed data, no setup required

### 2. **Search Modal Layout**
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search...                                      [Esc] │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ deploy lambda                                       │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📋 Tasks (3)                                            │
│ • #663b67e Deploy Lambda function to production         │
│   🔧 sa-aws | Running | infrastructure                  │
│                                                         │
│ • #7a8c9f1 Update Lambda environment variables          │
│   🤖 default | Ready | infrastructure                   │
│                                                         │
│ • #abc123d Lambda memory optimization                   │
│   🔧 sa-aws | Review | infrastructure                   │
│                                                         │
│ 📂 Projects (1)                                         │
│ • Infrastructure Team (12 tasks)                        │
│                                                         │
│ 🤖 Agents (1)                                           │
│ • sa-aws (AWS Solutions Architect)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
    ↑↓ Navigate | Enter Select | Esc Close
```

### 3. **Search Scope**

#### Tasks
```typescript
interface TaskSearchResult {
  type: 'task'
  id: string
  displayId: string          // #663b67e
  title: string
  status: TaskStatus
  assigneeName: string
  assigneeAvatar: string
  projectName: string
  priority: Priority
  matchedField: 'title' | 'description' | 'id'
}
```

Searchable fields:
- Task ID (full or partial: `663b67e`, `#663`)
- Title (case-insensitive)
- Description content
- Assignee name

Match examples:
- `lambda` → Matches "Deploy Lambda function"
- `#663` → Matches task ID #663b67e
- `aws` → Matches tasks assigned to sa-aws
- `urgent` → Matches high-priority tasks (future)

#### Projects
```typescript
interface ProjectSearchResult {
  type: 'project'
  slug: string
  name: string
  description: string
  taskCount: number
  status: 'active' | 'archived'
  matchedField: 'name' | 'description'
}
```

Searchable fields:
- Project name
- Project description
- Board slug

Match examples:
- `infra` → "Infrastructure Team"
- `mobile` → "Mobile App"
- `frontend` → "Frontend Redesign"

#### Agents
```typescript
interface AgentSearchResult {
  type: 'agent'
  id: string
  name: string
  avatar: string
  role: string
  activeTasks: number
  matchedField: 'name' | 'role'
}
```

Searchable fields:
- Agent name
- Agent role/specialization
- Profile ID

Match examples:
- `aws` → sa-aws agent
- `writer` → technical-writer agent
- `database` → database-engineer

#### Skills
```typescript
interface SkillSearchResult {
  type: 'skill'
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  matchedField: 'name' | 'description'
}
```

Searchable fields:
- Skill name
- Skill description
- Category

Match examples:
- `terraform` → terraform-deploy skill
- `test` → pytest-runner, jest-test skills
- `docker` → docker-compose skill

### 4. **Search Algorithm**

#### Fuzzy Matching
```typescript
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  
  // Exact substring match
  if (t.includes(q)) return true
  
  // Word boundary match
  const words = t.split(/\s+/)
  if (words.some(w => w.startsWith(q))) return true
  
  // Fuzzy character sequence (future enhancement)
  // "dpl" matches "Deploy"
  
  return false
}
```

#### Ranking Algorithm
```typescript
function rankResults(results: SearchResult[], query: string): SearchResult[] {
  return results.sort((a, b) => {
    // Exact ID match first
    if (a.type === 'task' && a.displayId.includes(query)) return -1
    if (b.type === 'task' && b.displayId.includes(query)) return 1
    
    // Title/name exact match
    if (a.title?.toLowerCase() === query.toLowerCase()) return -1
    if (b.title?.toLowerCase() === query.toLowerCase()) return 1
    
    // Starts with query
    if (a.title?.toLowerCase().startsWith(query.toLowerCase())) return -1
    if (b.title?.toLowerCase().startsWith(query.toLowerCase())) return 1
    
    // Contains query (already matched, so sort by relevance)
    return 0
  })
}
```

Priority:
1. **Exact ID match** - #663b67e for query "663b67e"
2. **Exact name match** - "Deploy Lambda" for query "deploy lambda"
3. **Starts with** - "Lambda function" for query "lambda"
4. **Contains** - "Update Lambda env" for query "lambda"
5. **Fuzzy match** - "Deploy" for query "dpl" (future)

### 5. **Result Actions**

#### Task Results
Click or press Enter to:
- Open task detail modal
- Navigate to task's project
- Preserve search term for highlighting

#### Project Results
Click to:
- Switch to that project/board
- Navigate to Kanban view
- Close search modal

#### Agent Results
Click to:
- Open chat view with that agent
- View agent's tasks
- Configure agent (future)

#### Skill Results
Click to:
- View skill details
- Enable/disable skill
- Open skill configuration

### 6. **Keyboard Navigation**

#### Shortcuts
- `Ctrl/Cmd+K` - Open search modal
- `Esc` - Close search modal
- `↑` / `↓` - Navigate results
- `Enter` - Select highlighted result
- `Tab` - Cycle through result types
- `Ctrl/Cmd+1-9` - Jump to result by number

#### Navigation Flow
```
Open modal (Ctrl+K)
  ↓
Type query
  ↓
Results appear (live filtered)
  ↓
Press ↓ to highlight first result
  ↓
Press ↓/↑ to move between results
  ↓
Press Enter to select
  ↓
Modal closes, action executes
```

### 7. **Empty States**

#### No Query
```
┌─────────────────────────────────────┐
│ 🔍 Search...                        │
├─────────────────────────────────────┤
│                                     │
│ 💡 Quick Actions                    │
│ • New Task (C)                      │
│ • New Project (P)                   │
│ • Switch to Board View (B)          │
│ • Switch to Table View (T)          │
│                                     │
│ 📌 Recent                           │
│ • #663b67e Deploy Lambda...         │
│ • Infrastructure Team               │
│ • sa-aws agent                      │
└─────────────────────────────────────┘
```

#### No Results
```
┌─────────────────────────────────────┐
│ 🔍 xyz123notfound                   │
├─────────────────────────────────────┤
│                                     │
│        🔍                           │
│   No results found                  │
│                                     │
│   Try searching for:                │
│   • Task ID or title                │
│   • Project name                    │
│   • Agent name                      │
│   • Skill name                      │
└─────────────────────────────────────┘
```

### 8. **Search History**

#### Recent Searches
```typescript
interface SearchHistory {
  query: string
  timestamp: number
  resultCount: number
  selectedResult?: {
    type: string
    id: string
  }
}
```

Stored in:
- Browser localStorage
- Max 20 recent searches
- Clear on logout (future)

Display:
```
Recent Searches:
• lambda deploy
• infrastructure project
• sa-aws agent
```

### 9. **Advanced Filters** (Future)

#### Filter Syntax
```
status:running lambda         // Tasks in 'running' status
assignee:sa-aws urgent        // Tasks assigned to sa-aws
project:infrastructure deploy // Tasks in infrastructure project
priority:high security        // High priority security tasks
```

#### Filter Examples
- `status:review` - All tasks pending review
- `assignee:technical-writer` - Writer's tasks
- `is:blocked` - Blocked tasks
- `has:attachments` - Tasks with files
- `created:today` - Tasks created today

## Technical Implementation

### Component: `SearchModal.tsx`
```typescript
interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  tasks: Task[]
  projects: Project[]
  agents: AIAgent[]
  skills: Skill[]
  onNavigate: (tab: ViewTab) => void
}
```

### Search Logic
```typescript
const [query, setQuery] = useState('')
const [results, setResults] = useState<SearchResult[]>([])
const [selectedIndex, setSelectedIndex] = useState(0)

useEffect(() => {
  if (!query.trim()) {
    setResults([])
    return
  }
  
  const taskResults = tasks
    .filter(t => 
      t.displayId.toLowerCase().includes(query.toLowerCase()) ||
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.description?.toLowerCase().includes(query.toLowerCase())
    )
    .map(t => ({ type: 'task', ...t }))
  
  const projectResults = projects
    .filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description?.toLowerCase().includes(query.toLowerCase())
    )
    .map(p => ({ type: 'project', ...p }))
  
  const agentResults = agents
    .filter(a =>
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.role.toLowerCase().includes(query.toLowerCase())
    )
    .map(a => ({ type: 'agent', ...a }))
  
  const skillResults = skills
    .filter(s =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.description.toLowerCase().includes(query.toLowerCase())
    )
    .map(s => ({ type: 'skill', ...s }))
  
  setResults([
    ...taskResults.slice(0, 5),
    ...projectResults.slice(0, 3),
    ...agentResults.slice(0, 3),
    ...skillResults.slice(0, 3)
  ])
  
  setSelectedIndex(0)
}, [query, tasks, projects, agents, skills])
```

### Keyboard Handler
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      break
    
    case 'ArrowUp':
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
      break
    
    case 'Enter':
      e.preventDefault()
      handleSelectResult(results[selectedIndex])
      break
    
    case 'Escape':
      e.preventDefault()
      onClose()
      break
  }
}
```

### Result Selection
```typescript
const handleSelectResult = (result: SearchResult) => {
  switch (result.type) {
    case 'task':
      // Open task detail modal
      openTaskModal(result.id)
      break
    
    case 'project':
      // Switch to project board
      selectProject(result.slug)
      onNavigate('my_issues')
      break
    
    case 'agent':
      // Open chat with agent
      selectAgentForChat(result.id)
      onNavigate('chat')
      break
    
    case 'skill':
      // Navigate to skills view, highlight this skill
      onNavigate('skills')
      highlightSkill(result.id)
      break
  }
  
  onClose()
}
```

## User Interactions

### Opening Search
1. Press `Ctrl/Cmd+K` from anywhere
2. Modal appears with focus in input
3. Start typing immediately

### Searching
1. Type query (e.g., "lambda")
2. Results appear in real-time
3. Grouped by type (Tasks, Projects, Agents, Skills)
4. Each group shows top N results

### Selecting Result
1. **Mouse**: Click any result
2. **Keyboard**: Press ↓ to navigate, Enter to select
3. Action executes based on result type
4. Modal closes automatically

## Design Tokens (Aura Theme)

### Modal Styling
```css
.search-modal {
  position: fixed;
  top: 20vh;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  max-height: 60vh;
  
  background: #191C21;
  border: 1px solid #F97316;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  
  z-index: 1000;
}
```

### Input
```css
.search-input {
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  color: #F3F4F6;
  font-size: 16px;
  outline: none;
}

.search-input::placeholder {
  color: #6B7280;
}
```

### Results
```css
.search-result {
  padding: 12px 20px;
  cursor: pointer;
  transition: background 150ms ease;
}

.search-result:hover,
.search-result.selected {
  background: rgba(249, 115, 22, 0.1);
  border-left: 3px solid #F97316;
}
```

### Typography
- **Input**: Inter, 16px
- **Result Title**: Inter, 14px, font-weight 500
- **Result Meta**: JetBrains Mono, 12px, color muted

## Performance Optimizations

1. **Debounced Search**: 150ms delay after last keystroke
2. **Result Limiting**: Max 15 total results shown
3. **Virtual Scrolling**: For 100+ results (future)
4. **Memoized Filtering**: Cache results for same query

## Accessibility

- Focus trap within modal
- Screen reader announces result count
- ARIA labels on all interactive elements
- High contrast selection indicator
- Keyboard-only operation supported

## Future Enhancements
- Search syntax autocomplete
- Saved search queries
- Search across comments/attachments
- Full-text search in task descriptions
- Search result previews (hover)
- Search analytics (most searched terms)
- Global search API (search all workspaces)
- Fuzzy matching improvements
- Typo tolerance
- Search suggestions ("Did you mean...")
