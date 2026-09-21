# Autopilot (Cron Job Scheduler)

## Overview
Automated task scheduling system powered by Hermes cron engine, enabling recurring AI agent executions for routine maintenance, monitoring, and automation workflows.

## Key Features

### 1. **Cron Job Structure**
```typescript
interface AutopilotJob {
  id: string                    // Unique job identifier
  name: string                  // Human-readable name
  schedule: string              // Cron expression (5-field)
  prompt: string                // Task instruction for agent
  profile: string               // Agent profile to execute
  status: 'active' | 'paused'
  last_run?: number             // Unix timestamp
  next_run?: number             // Unix timestamp
  last_result?: string          // Last execution outcome
  run_count?: number            // Total executions
  error_count?: number          // Failed executions
  created_at?: number
}
```

### 2. **Autopilot View Layout**

#### Job List Display
```
┌─────────────────────────────────────────────────────────┐
│ ⚡ Autopilot Scheduler                       [+ New]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🔄 Daily Infrastructure Scan         Active      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Schedule: 0 9 * * *  (Daily at 9:00 AM)         │  │
│  │ Agent: sa-aws                                     │  │
│  │ Task: "Check AWS resources and report costs"     │  │
│  │                                                   │  │
│  │ Last Run: 2h ago ✅ Success                      │  │
│  │ Next Run: in 22h                                 │  │
│  │ Runs: 45 | Errors: 2 (95.6% success)            │  │
│  │                                                   │  │
│  │ [▶️ Run Now] [⏸️ Pause] [⚙️ Edit] [🗑️ Delete]    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📊 Weekly Analytics Report           Active      │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ Schedule: 0 8 * * 1  (Mondays at 8:00 AM)       │  │
│  │ Agent: default                                    │  │
│  │ Task: "Generate weekly metrics report"           │  │
│  │                                                   │  │
│  │ Last Run: 3d ago ✅ Success                      │  │
│  │ Next Run: in 4d                                  │  │
│  │ Runs: 12 | Errors: 0 (100% success)             │  │
│  │                                                   │  │
│  │ [▶️ Run Now] [⏸️ Pause] [⚙️ Edit] [🗑️ Delete]    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3. **Creating Autopilot Jobs**

#### Creation Modal
```typescript
interface CreateAutopilotParams {
  name: string              // Job display name
  schedule: string          // Cron expression
  prompt: string            // Agent instructions
  profile: string           // Agent profile ID
}
```

Form interface:
```
┌─────────────────────────────────────┐
│ Create Autopilot Job                │
├─────────────────────────────────────┤
│ Job Name:                           │
│ [Security Audit_____________]       │
│                                     │
│ Schedule (Cron):                    │
│ [0 2 * * *___________________]      │
│ 💡 Daily at 2:00 AM                │
│ [📅 Quick Presets ▼]               │
│                                     │
│ Agent Profile:                      │
│ [sa-aws                       ▼]    │
│                                     │
│ Task Instructions:                  │
│ ┌─────────────────────────────────┐ │
│ │Run security audit on all AWS    │ │
│ │resources, check for:            │ │
│ │- Unencrypted S3 buckets         │ │
│ │- Open security groups           │ │
│ │- Unused IAM credentials         │ │
│ │Generate report and create       │ │
│ │tasks for any findings.          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel] [Create Autopilot]         │
└─────────────────────────────────────┘
```

#### Cron Expression Helper
Quick presets dropdown:
```
┌──────────────────────────────┐
│ Every 5 minutes: */5 * * * * │
│ Every hour: 0 * * * *        │
│ Daily at 9am: 0 9 * * *      │
│ Weekly (Mon): 0 9 * * 1      │
│ Monthly (1st): 0 9 1 * *     │
│ ────────────────────────────│
│ Custom...                    │
└──────────────────────────────┘
```

Cron format (5 fields):
```
┌───────────── minute (0-59)
│ ┌─────────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌─────── month (1-12)
│ │ │ │ ┌───── day of week (0-7, Sun=0 or 7)
│ │ │ │ │
* * * * *
```

Examples:
- `0 9 * * *` - Daily at 9:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 0 * * 0` - Weekly on Sunday at midnight
- `0 2 1 * *` - Monthly on the 1st at 2:00 AM

### 4. **Job Actions**

#### Run Now (Manual Trigger)
```typescript
const handleRunNow = async (jobId: string) => {
  const ok = await hermesApi.triggerCronJob(jobId)
  if (ok) {
    // Refresh to show updated last_run and next_run
    loadLiveData()
    pushToast('success', 'Autopilot job triggered')
  } else {
    pushToast('error', 'Failed to trigger job')
  }
}
```

Behavior:
- Executes job immediately, outside regular schedule
- Does not affect next scheduled run
- Increments run_count
- Updates last_run timestamp
- Result appears in job history

#### Pause/Resume
```typescript
const handleToggleStatus = async (
  jobId: string, 
  current: 'active' | 'paused'
) => {
  // Optimistic update
  setAutopilots(prev => prev.map(j => 
    j.id === jobId 
      ? { ...j, status: current === 'active' ? 'paused' : 'active' } 
      : j
  ))
  
  const ok = current === 'active'
    ? await hermesApi.pauseCronJob(jobId)
    : await hermesApi.resumeCronJob(jobId)
  
  if (!ok) {
    // Revert on failure
    setAutopilots(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: current } : j
    ))
    pushToast('error', 'Status change failed')
  }
}
```

States:
- **Active**: Job runs on schedule automatically
- **Paused**: Job skipped, no executions until resumed

Use cases:
- Pause during maintenance windows
- Temporarily disable problematic jobs
- Stop jobs during deployments

#### Edit Job
- Update name, schedule, prompt, or profile
- Changes take effect on next run
- Preserves execution history

#### Delete Job
- Permanently removes job
- Stops all future executions
- Confirmation required
- History preserved in database (optional)

### 5. **Execution History**

#### Job Details Modal
```
┌──────────────────────────────────────────────────────┐
│ 🔄 Daily Infrastructure Scan - Execution History     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Recent Runs (last 10):                             │
│                                                      │
│  ✅ Sep 21, 09:00 - Success (45s)                   │
│     Created 3 tasks, 0 errors                       │
│     [View Report]                                    │
│                                                      │
│  ✅ Sep 20, 09:00 - Success (42s)                   │
│     Created 1 task, 0 errors                        │
│     [View Report]                                    │
│                                                      │
│  ❌ Sep 19, 09:00 - Error (5s)                      │
│     AWS credentials expired                          │
│     [View Logs]                                      │
│                                                      │
│  ✅ Sep 18, 09:00 - Success (48s)                   │
│     Created 2 tasks, 0 errors                       │
│     [View Report]                                    │
│                                                      │
│  Statistics:                                         │
│  ├─ Total Runs: 45                                  │
│  ├─ Success: 43 (95.6%)                             │
│  ├─ Errors: 2 (4.4%)                                │
│  ├─ Avg Duration: 44s                               │
│  └─ Total Tasks Created: 127                        │
│                                                      │
│  [Close]                                             │
└──────────────────────────────────────────────────────┘
```

#### Run Result Types
```typescript
interface JobRunResult {
  run_id: number
  job_id: string
  started_at: number
  ended_at: number
  duration: number          // Seconds
  status: 'success' | 'error' | 'timeout'
  tasks_created?: number
  error_message?: string
  output_summary?: string
}
```

### 6. **Common Autopilot Patterns**

#### Infrastructure Monitoring
```yaml
name: "AWS Cost Monitor"
schedule: "0 8 * * *"  # Daily 8 AM
profile: "sa-aws"
prompt: |
  Check yesterday's AWS costs across all services.
  If any service exceeded $100, create a high-priority
  task for review. Generate cost breakdown report.
```

#### Database Maintenance
```yaml
name: "Database Health Check"
schedule: "0 2 * * 0"  # Weekly Sunday 2 AM
profile: "database-engineer"
prompt: |
  Run health check on all production databases:
  1. Check replication lag
  2. Analyze slow queries
  3. Vacuum and reindex if needed
  4. Create task for any issues found
```

#### Documentation Updates
```yaml
name: "API Docs Sync"
schedule: "0 10 * * 1-5"  # Weekdays 10 AM
profile: "technical-writer"
prompt: |
  Check if API endpoints changed since last run.
  Update OpenAPI spec and regenerate docs.
  Create review task if changes detected.
```

#### Security Scanning
```yaml
name: "Dependency Audit"
schedule: "0 3 * * 1"  # Weekly Monday 3 AM
profile: "default"
prompt: |
  Run npm audit and pip-audit on all projects.
  For any critical vulnerabilities:
  1. Create urgent task with details
  2. Assign to appropriate agent
  3. Notify via Slack webhook
```

### 7. **Failure Handling**

#### Error Notification
When job fails:
```typescript
interface JobError {
  job_id: string
  error_type: 'timeout' | 'execution' | 'api' | 'permission'
  message: string
  retry_count: number
}
```

Actions:
- Log to Hermes database
- Increment error_count
- Update last_result field
- Send notification (future: email, Slack)
- Optional: Auto-pause after N consecutive failures

#### Retry Logic
```yaml
# Job configuration
retry_on_failure: true
max_retries: 3
retry_backoff: exponential  # 1m, 2m, 4m
```

Behavior:
- First failure: Retry after 1 minute
- Second failure: Retry after 2 minutes
- Third failure: Retry after 4 minutes
- Final failure: Mark as error, don't retry

### 8. **Concurrent Execution**

#### Overlap Prevention
```yaml
# Prevent job from starting if previous run still active
allow_concurrent: false
max_runtime: 3600  # Timeout after 1 hour
```

If job still running when next schedule arrives:
- **allow_concurrent: false** - Skip this run, wait for next
- **allow_concurrent: true** - Start new instance in parallel

Use cases:
- Long-running jobs: `allow_concurrent: false`
- Quick checks: `allow_concurrent: true`

## Technical Implementation

### Component: `AutopilotView.tsx`
```typescript
interface AutopilotViewProps {
  autopilots: AutopilotJob[]
  onRunNow: (jobId: string) => void
  onToggleStatus: (jobId: string, status: 'active' | 'paused') => void
  onNewAutopilot: () => void
}
```

### Data Loading
```typescript
// Fetch all cron jobs
const loadAutopilots = async () => {
  const liveJobs = await hermesApi.getCronJobs()
  if (liveJobs.length > 0) {
    setAutopilots(liveJobs)
  }
}

// Auto-refresh every 30 seconds
useEffect(() => {
  loadAutopilots()
  const interval = setInterval(loadAutopilots, 30000)
  return () => clearInterval(interval)
}, [])
```

### Time Formatting
```typescript
const formatNextRun = (nextRun: number) => {
  const now = Date.now()
  const diff = nextRun - now
  
  if (diff < 0) return 'Overdue'
  if (diff < 3600000) return `in ${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `in ${Math.floor(diff / 3600000)}h`
  return `in ${Math.floor(diff / 86400000)}d`
}
```

## User Interactions

### Creating Autopilot
1. Click "+ New" button
2. Fill job name and schedule
3. Select agent profile
4. Write task instructions
5. Submit - job starts on next schedule

### Manual Trigger
1. Click "▶️ Run Now" on any job
2. Execution starts immediately
3. Watch job card for result
4. Check created tasks in Kanban

### Pausing Job
1. Click "⏸️ Pause" button
2. Job status changes to "Paused"
3. Next runs skipped until resumed
4. Click "▶️ Resume" to reactivate

## Design Tokens (Aura Theme)

### Job Card
```css
.autopilot-card {
  background: #191C21;
  border: 1px solid #2A2524;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.autopilot-card.active {
  border-left: 3px solid #10B981;
}

.autopilot-card.paused {
  border-left: 3px solid #F59E0B;
  opacity: 0.7;
}
```

### Status Badges
```css
.status-success {
  background: #10B981;
  color: white;
}

.status-error {
  background: #EF4444;
  color: white;
}

.status-running {
  background: #F97316;
  color: white;
  animation: pulse 2s infinite;
}
```

## Integration Points

### Backend API Endpoints
```typescript
// List all jobs
GET /api/cron/jobs

// Create job
POST /api/cron/jobs
{
  "name": "Daily Audit",
  "schedule": "0 9 * * *",
  "prompt": "Check AWS resources",
  "profile": "sa-aws"
}

// Trigger immediately
POST /api/cron/jobs/{id}/trigger

// Pause job
POST /api/cron/jobs/{id}/pause

// Resume job
POST /api/cron/jobs/{id}/resume

// Delete job
DELETE /api/cron/jobs/{id}

// Get execution history
GET /api/cron/jobs/{id}/history
```

## Performance & Scalability

- Supports 1000+ concurrent cron jobs
- Distributed execution (multiple Hermes instances)
- Job queue with priority scheduling
- Execution timeout enforcement
- Resource limits per job

## Accessibility

- Keyboard shortcuts for common actions
- Screen reader announces job status changes
- High contrast status indicators
- Clear visual hierarchy

## Future Enhancements
- Visual cron expression builder
- Job templates library
- Conditional execution (only run if X)
- Job dependencies (run B after A succeeds)
- Output notifications (email, Slack, Teams)
- Job chaining (multi-step workflows)
- A/B testing different schedules
- Cost optimization (run during off-peak)
- Job performance analytics
- Execution logs searchable UI
