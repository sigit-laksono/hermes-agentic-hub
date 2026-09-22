# AI Team Management (Agents, Squads, Skills)

## Overview
Comprehensive management interface for AI agent profiles, team compositions (squads), and installed skill capabilities within the Hermes ecosystem.

## Key Features

### 1. **Agents View**

#### Profile Management
```typescript
interface AIAgent {
  id: string                 // Profile slug (e.g., "sa-aws")
  name: string              // Display name
  avatar: string            // Emoji icon
  role: string              // Specialization
  model: string             // Claude model (opus-5, sonnet-5, etc.)
  temperature?: number      // 0.0 - 1.0
  max_tokens?: number       // Max response length
  system_prompt?: string    // Custom instructions
  skills?: string[]         // Enabled skill IDs
  status: 'active' | 'offline' | 'busy'
}
```

#### Built-in Profiles
```
🔧 sa-aws (AWS Solutions Architect)
├─ Model: Claude Opus 5
├─ Specialization: AWS infrastructure, Lambda, CloudFormation
├─ System Prompt: "You are an expert AWS Solutions Architect..."
├─ Skills: terraform-deploy, aws-cli, cloudformation-validate
└─ Status: Active

☁️ sa-microsoft (Azure Specialist)
├─ Model: Claude Sonnet 5
├─ Specialization: Azure services, ARM templates, PowerShell
├─ System Prompt: "You are a Microsoft Azure expert..."
├─ Skills: azure-deploy, arm-template, bicep
└─ Status: Active

📝 technical-writer (Documentation Specialist)
├─ Model: Claude Sonnet 5
├─ Specialization: Technical writing, API docs, user guides
├─ System Prompt: "You are a technical documentation expert..."
├─ Skills: markdown-format, docs-lint, api-reference
└─ Status: Active

🗄️ database-engineer (Database Expert)
├─ Model: Claude Opus 5
├─ Specialization: Database design, query optimization, migrations
├─ System Prompt: "You are a database engineering expert..."
├─ Skills: sql-lint, migration-gen, schema-design
└─ Status: Active

🤖 default (General Purpose)
├─ Model: Claude Opus 5
├─ Specialization: General software engineering
├─ System Prompt: "You are a helpful software engineering assistant..."
├─ Skills: All available
└─ Status: Active
```

#### Agent Card Display
```
┌─────────────────────────────────────────────┐
│ 🔧 sa-aws                           Active  │
│ AWS Solutions Architect                     │
├─────────────────────────────────────────────┤
│ Model: Claude Opus 5                        │
│ Active Tasks: 3                             │
│ Completed: 47                               │
│                                             │
│ Skills (5):                                 │
│ • terraform-deploy                          │
│ • aws-cli                                   │
│ • cloudformation-validate                   │
│ • +2 more                                   │
│                                             │
│ [💬 Chat] [📋 View Tasks] [⚙️ Configure]    │
└─────────────────────────────────────────────┘
```

#### Agent Actions
- **💬 Chat**: Open chat view with this profile
- **📋 View Tasks**: Filter Kanban to show this agent's tasks
- **⚙️ Configure**: Edit profile settings
- **📊 Analytics**: View performance metrics
- **🔴 Disable**: Mark agent as offline

#### Creating New Agents
```typescript
interface CreateProfilePayload {
  id: string                    // Unique slug
  name: string                  // Display name
  avatar: string                // Emoji
  role: string                  // Description
  model: string                 // Claude model ID
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  skills?: string[]
}
```

Form fields:
```
┌─────────────────────────────────────┐
│ Create New Agent Profile            │
├─────────────────────────────────────┤
│ ID: [frontend-specialist______]     │
│ Name: [Frontend Specialist____]     │
│ Avatar: [🎨]                        │
│ Role: [React/Vue specialist___]     │
│ Model: [Claude Opus 5        ▼]    │
│ Temperature: [====•-----] 0.7       │
│ Max Tokens: [4000_______________]   │
│                                     │
│ System Prompt:                      │
│ ┌─────────────────────────────────┐ │
│ │You are an expert frontend       │ │
│ │developer specializing in...     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Skills (select):                    │
│ ☑ react-lint                       │
│ ☑ webpack-config                   │
│ ☑ typescript-check                 │
│ ☐ docker-deploy                    │
│                                     │
│ [Cancel] [Create Profile]           │
└─────────────────────────────────────┘
```

### 2. **Squads View**

#### Squad Composition
```typescript
interface Squad {
  id: string                    // Squad identifier
  name: string                  // "AWS Dream Team"
  description: string
  members: string[]             // Agent profile IDs
  orchestration_pattern: string // "parallel", "sequential", "leader-follower"
  created_at: number
  active_missions?: number
}
```

#### Pre-configured Squads
```
🚀 Cloud Infrastructure Squad
├─ Members: sa-aws, sa-microsoft
├─ Pattern: Parallel execution
├─ Use Case: Multi-cloud deployments
└─ Active Missions: 2

📚 Documentation Squad
├─ Members: technical-writer, default
├─ Pattern: Sequential (writer → reviewer)
├─ Use Case: End-to-end documentation
└─ Active Missions: 1

🔧 Full Stack Squad
├─ Members: frontend-specialist, database-engineer, default
├─ Pattern: Leader-follower (default leads)
├─ Use Case: Complex feature development
└─ Active Missions: 0
```

#### Squad Card Display
```
┌─────────────────────────────────────────────┐
│ 🚀 Cloud Infrastructure Squad               │
│ Multi-cloud deployment specialists          │
├─────────────────────────────────────────────┤
│ Members (2):                                │
│ • 🔧 sa-aws                                 │
│ • ☁️ sa-microsoft                          │
│                                             │
│ Orchestration: Parallel                     │
│ Active Missions: 2                          │
│ Success Rate: 94%                           │
│                                             │
│ [🎯 Assign Task] [⚙️ Configure] [📊 Stats]  │
└─────────────────────────────────────────────┘
```

#### Orchestration Patterns

**Parallel**
```
Task → [Agent A]
     → [Agent B] → Merge Results
     → [Agent C]
```

Use case: Independent subtasks (e.g., deploy to AWS + Azure simultaneously)

**Sequential**
```
Task → [Agent A] → [Agent B] → [Agent C] → Done
```

Use case: Pipeline (e.g., code → test → deploy → document)

**Leader-Follower**
```
Task → [Leader Agent] → Delegates to:
                        ├─ [Follower A]
                        ├─ [Follower B]
                        └─ [Follower C]
                        ← Reviews & Merges
```

Use case: Complex coordination (e.g., architect breaks down work, specialists implement)

#### Creating Squads
```
┌─────────────────────────────────────┐
│ Create New Squad                    │
├─────────────────────────────────────┤
│ Name: [DevOps Squad___________]     │
│ Description:                        │
│ ┌─────────────────────────────────┐ │
│ │Handles CI/CD, deployment, and   │ │
│ │infrastructure automation        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Members (select):                   │
│ ☑ sa-aws                           │
│ ☑ database-engineer                │
│ ☐ technical-writer                 │
│ ☐ default                          │
│                                     │
│ Orchestration Pattern:              │
│ ○ Parallel                         │
│ ● Sequential                       │
│ ○ Leader-Follower                  │
│                                     │
│ [Cancel] [Create Squad]             │
└─────────────────────────────────────┘
```

### 3. **Skills View**

#### Skill Catalog
```typescript
interface Skill {
  id: string                    // Skill identifier
  name: string                  // Display name
  description: string
  category: string              // "infrastructure", "testing", "docs", etc.
  version: string               // Semantic version
  enabled: boolean
  dependencies?: string[]       // Required tools/packages
  author?: string
  install_path?: string
}
```

#### Skill Categories

**Infrastructure**
- `terraform-deploy` - Terraform plan/apply automation
- `aws-cli` - AWS CLI commands wrapper
- `cloudformation-validate` - CFN template validation
- `docker-compose` - Container orchestration
- `kubernetes-apply` - K8s manifest deployment

**Testing**
- `pytest-runner` - Python test execution
- `jest-test` - JavaScript/TypeScript testing
- `load-test` - Performance testing with k6
- `security-scan` - SAST/DAST scanning

**Documentation**
- `markdown-format` - Markdown linting & formatting
- `openapi-gen` - OpenAPI spec generation
- `diagram-render` - Mermaid/PlantUML rendering

**Database**
- `sql-lint` - SQL query validation
- `migration-gen` - Database migration generator
- `schema-design` - ER diagram from schema

**Code Quality**
- `eslint-check` - JavaScript linting
- `prettier-format` - Code formatting
- `typescript-check` - Type checking

#### Skill Card Display
```
┌─────────────────────────────────────────────┐
│ 📦 terraform-deploy                Enabled  │
│ Infrastructure > Terraform                  │
├─────────────────────────────────────────────┤
│ Version: 1.2.3                              │
│ Description:                                │
│ Automates Terraform plan/apply workflow    │
│ with validation and cost estimation        │
│                                             │
│ Dependencies:                               │
│ • terraform >= 1.5.0                       │
│ • tflint                                   │
│                                             │
│ Usage: 47 times                            │
│ Success Rate: 98%                          │
│                                             │
│ [🔴 Disable] [⚙️ Configure] [📖 Docs]       │
└─────────────────────────────────────────────┘
```

#### Installing Skills
```
┌─────────────────────────────────────┐
│ Install Skill from Marketplace      │
├─────────────────────────────────────┤
│ Search: [kubernetes____________]    │
│                                     │
│ 📦 kubernetes-apply                 │
│ Deploy K8s manifests with kubectl   │
│ ⭐ 4.8 | 1.2K installs             │
│ [+ Install]                         │
│                                     │
│ 📦 helm-deploy                      │
│ Helm chart deployment automation    │
│ ⭐ 4.6 | 890 installs              │
│ [+ Install]                         │
│                                     │
│ 📦 k8s-debug                        │
│ Kubernetes troubleshooting toolkit  │
│ ⭐ 4.5 | 567 installs              │
│ [+ Install]                         │
└─────────────────────────────────────┘
```

#### Skill Configuration
```typescript
interface SkillConfig {
  enabled: boolean
  default_params?: Record<string, any>
  rate_limit?: number          // Calls per minute
  timeout?: number             // Seconds
  allowed_agents?: string[]    // Which profiles can use
  environment?: Record<string, string>
}
```

Example config:
```yaml
# ~/.hermes/skills/terraform-deploy/config.yaml
enabled: true
default_params:
  auto_approve: false
  backend: s3
  workspace: production
rate_limit: 10
timeout: 300
allowed_agents:
  - sa-aws
  - default
environment:
  TF_LOG: INFO
```

## Technical Implementation

### Components
```typescript
// AITeamViews.tsx
export const AgentsView: React.FC<{
  agents: AIAgent[]
  tasks: Task[]
  onRefreshAgents: () => void
  onSelectAgentForChat: (agentId: string) => void
}>

export const SquadsView: React.FC<{
  squads: Squad[]
  agents: AIAgent[]
  onRefresh: () => void
}>

export const SkillsView: React.FC<{
  skills: Skill[]
  onRefreshSkills: () => void
}>
```

### Data Loading
```typescript
// Load agents/profiles
const loadAgents = async () => {
  const profiles = await hermesApi.getProfiles()
  setAgents(profiles)
}

// Load squads (derived from orchestration config)
const loadSquads = async () => {
  const squads = await hermesApi.getSquads()
  setSquads(squads)
}

// Load skills
const loadSkills = async () => {
  const skills = await hermesApi.getSkills()
  setSkills(skills)
}
```

### Agent Task Filtering
```typescript
const getAgentTasks = (agentId: string) => {
  return tasks.filter(t => t.assigneeProfile === agentId)
}

const getAgentStats = (agentId: string) => {
  const agentTasks = getAgentTasks(agentId)
  return {
    active: agentTasks.filter(t => t.status !== 'done' && t.status !== 'archived').length,
    completed: agentTasks.filter(t => t.status === 'done').length,
    successRate: calculateSuccessRate(agentTasks)
  }
}
```

## User Interactions

### Managing Agents
1. **View All**: Navigate to "Agents" tab
2. **Filter by Status**: Active / Offline / Busy
3. **Search**: Find agent by name/role
4. **Chat**: Click "💬 Chat" to open conversation
5. **Configure**: Click "⚙️" to edit profile settings
6. **Create New**: Click "+ New Agent" button

### Managing Squads
1. **View All**: Navigate to "Squads" tab
2. **Assign Task**: Select squad, click "🎯 Assign Task"
3. **View Members**: Expand to see all agents
4. **Configure**: Edit orchestration pattern
5. **Create New**: Click "+ New Squad" button

### Managing Skills
1. **View All**: Navigate to "Skills" tab
2. **Filter by Category**: Infrastructure / Testing / Docs
3. **Enable/Disable**: Toggle per skill
4. **Configure**: Set parameters and permissions
5. **Install New**: Browse marketplace

## Design Tokens (Aura Theme)

### Card Styling
```css
.agent-card, .squad-card, .skill-card {
  background: #191C21;
  border: 1px solid #2A2524;
  border-radius: 12px;
  padding: 16px;
  transition: all 200ms ease;
}

.agent-card:hover {
  border-color: #F97316;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(249, 115, 22, 0.2);
}
```

### Status Badges
```css
.status-active {
  background: #10B981;
  color: white;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}

.status-offline {
  background: #6B7280;
}

.status-busy {
  background: #F59E0B;
}
```

## Integration Points

### Backend API Endpoints
```typescript
// Agents
GET /api/profiles                    // List all profiles
POST /api/profiles                   // Create profile
PUT /api/profiles/{id}               // Update profile
DELETE /api/profiles/{id}            // Delete profile

// Squads
GET /api/squads                      // List all squads
POST /api/squads                     // Create squad
GET /api/squads/{id}/missions        // Active missions

// Skills
GET /api/skills                      // List installed skills
POST /api/skills/{id}/enable         // Enable skill
POST /api/skills/{id}/disable        // Disable skill
PUT /api/skills/{id}/config          // Update config
POST /api/skills/install             // Install from marketplace
```

## Performance & Scalability

- Supports 100+ agents per workspace
- Real-time status updates via WebSocket
- Lazy-load skill details (fetch on demand)
- Cached profile data (5 min TTL)

## Accessibility

- Screen reader friendly card layouts
- Keyboard navigation between cards
- ARIA labels on all actions
- High contrast status indicators

## Future Enhancements
- Agent performance analytics dashboard
- Auto-scaling squad sizes
- Skill marketplace with ratings/reviews
- A/B testing different agent configurations
- Cost tracking per agent/squad
- Agent training mode (fine-tuning)
- Custom skill development IDE
- Squad templates library
- Agent collaboration metrics
