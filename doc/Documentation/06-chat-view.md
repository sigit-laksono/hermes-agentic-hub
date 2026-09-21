# Chat View (AI Conversation Interface)

## Overview
Real-time conversational interface for direct interaction with AI agents, supporting streaming responses, code execution, and conversion to actionable tasks.

## Key Features

### 1. **Multi-Profile Chat**
```typescript
interface ChatSession {
  id: string
  profile: string        // Agent profile (sa-aws, technical-writer, etc.)
  title: string          // Auto-generated or user-defined
  created_at: number
  messages: ChatMessage[]
}
```

Supported profiles:
- **default** - General-purpose assistant
- **sa-aws** - AWS Solutions Architect specialist
- **sa-microsoft** - Azure/Microsoft cloud expert
- **technical-writer** - Documentation specialist
- **database-engineer** - Database design & optimization

### 2. **Streaming Message Display**

#### Real-time Token Streaming
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string           // Streamed incrementally
  reasoning?: string     // Extended thinking (if enabled)
  timestamp: number
  complete: boolean
  thinking?: string      // Real-time thinking display
}
```

Visual states:
- **Typing Indicator**: `⚡ Thinking...` while processing
- **Token Streaming**: Text appears character-by-character
- **Thinking Section**: Collapsible reasoning display (Claude extended thinking)
- **Tool Execution**: Live tool call indicators

#### Server-Sent Events (SSE) Protocol
```typescript
// Event stream format
event: token
data: {"token": "Hello"}

event: thinking
data: {"thinking": "Analyzing the request..."}

event: tool_start
data: {"tool": "Bash", "input": "ls -la"}

event: tool_end
data: {"tool": "Bash", "output": "..."}

event: complete
data: {"usage": {"input_tokens": 150, "output_tokens": 320}}
```

### 3. **Rich Message Formatting**

#### Markdown Rendering
- **Headers**: H1-H6 with proper hierarchy
- **Code Blocks**: Syntax highlighted with Prism.js
- **Lists**: Ordered and unordered
- **Tables**: Full table support
- **Links**: Clickable URLs
- **Emphasis**: Bold, italic, strikethrough

#### Code Block Features
```typescript
<CodeBlock
  code={codeContent}
  language="typescript"
  showLineNumbers={true}
  copyButton={true}
/>
```

Actions:
- **Copy**: One-click clipboard copy
- **Download**: Save as file
- **Run**: Execute code (future)

#### Mermaid Diagram Rendering
```typescript
<MermaidViewer
  chart={mermaidCode}
  onError={(err) => console.error(err)}
/>
```

Supported diagrams:
- Flowcharts
- Sequence diagrams
- Class diagrams
- State diagrams
- Gantt charts
- Entity-relationship diagrams

### 4. **Tool Execution Visualization**

#### Live Tool Calls
```typescript
interface ToolCall {
  tool: string           // "Bash", "Read", "Write", etc.
  input: string          // Command or file path
  output?: string        // Result (streamed or complete)
  status: 'pending' | 'running' | 'complete' | 'error'
  duration?: number      // Execution time in ms
}
```

Visual representation:
```
🔧 Tool: Bash
├─ Input: git status
├─ Status: ⚡ Running...
└─ Output: 
   On branch main
   nothing to commit, working tree clean
✓ Completed in 0.8s
```

Collapsible sections for:
- Large outputs (>500 chars)
- Multiple tool calls
- Error traces

### 5. **Session Management**

#### New Session
```typescript
const createSession = (profile: string) => {
  const sessionId = `chat_${Date.now()}`
  return {
    id: sessionId,
    profile,
    title: `New Chat (${profile})`,
    created_at: Date.now(),
    messages: []
  }
}
```

Auto-saves to:
- `~/.hermes/chat_sessions/`
- Local browser storage (fallback)

#### Session History
```
┌─────────────────────────────────────┐
│ 📚 Previous Sessions                │
├─────────────────────────────────────┤
│ Today                               │
│ • "Deploy AWS Lambda function"      │
│ • "Debug database query"            │
│                                     │
│ Yesterday                           │
│ • "Write API documentation"         │
│ • "Refactor authentication code"   │
└─────────────────────────────────────┘
```

Features:
- Search sessions by keyword
- Filter by profile/date
- Resume from any message
- Export session as markdown

### 6. **Convert to Task**

#### Extraction Flow
```typescript
const handleConvertToIssue = (message: ChatMessage) => {
  // Extract structured data from conversation
  const issueData = {
    title: extractTitle(message.text),        // First line or summary
    description: message.text,                 // Full message as description
    assignee: currentProfile                   // Current chat profile
  }
  
  // Open New Issue Modal with pre-filled data
  onConvertToIssue(issueData)
}
```

Use cases:
1. **Action Items**: "Deploy this code" → Create task for `sa-aws`
2. **Bug Reports**: "Fix the auth bug" → Create task with full context
3. **Documentation**: "Write API docs" → Assign to `technical-writer`

Visual trigger:
```
┌──────────────────────────────────────┐
│ assistant: Here's the deployment...  │
│                                      │
│ [📋 Convert to Task]                 │
└──────────────────────────────────────┘
```

### 7. **Input Controls**

#### Message Input Area
```typescript
<textarea
  value={input}
  onChange={(e) => setInput(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      sendMessage()
    }
  }}
  placeholder="Ask anything... (Ctrl+Enter to send)"
  rows={3}
  className="chat-input"
/>
```

Features:
- Auto-resize (1-10 lines)
- Markdown preview (future)
- File attachment (drag-drop)
- Voice input (future)

#### Action Buttons
```
[📎 Attach] [🎤 Voice] [⚙️ Settings] [🚀 Send]
```

- **Attach**: Upload files for context
- **Voice**: Speech-to-text input
- **Settings**: Model/temperature/max_tokens
- **Send**: Submit message (Ctrl+Enter)

### 8. **Advanced Settings**

#### Model Configuration
```typescript
interface ChatSettings {
  model: 'claude-opus-5' | 'claude-sonnet-5' | 'claude-haiku-4-5'
  temperature: number      // 0.0 - 1.0
  max_tokens: number       // 1000 - 8000
  thinking_enabled: boolean // Extended thinking mode
  stream: boolean          // Real-time streaming
}
```

UI:
```
┌─────────────────────────────┐
│ ⚙️ Chat Settings            │
├─────────────────────────────┤
│ Model: Claude Opus 5    [▼] │
│ Temperature: [====•-----] 0.7│
│ Max Tokens: 4000        [▼] │
│ ☑ Enable streaming         │
│ ☑ Show thinking steps      │
└─────────────────────────────┘
```

### 9. **Approval & Clarification Flow**

#### Pending Approvals
When agent needs permission for risky actions:
```typescript
interface PendingApproval {
  id: string
  action: string           // "Delete files", "Deploy to prod"
  description: string
  risk_level: 'low' | 'medium' | 'high'
  options: ['approve', 'deny', 'modify']
}
```

Visual prompt:
```
⚠️ Agent is requesting permission:
┌─────────────────────────────────────┐
│ Delete 15 files in /tmp directory   │
│ Risk: Medium                        │
│                                     │
│ [✓ Approve] [✗ Deny] [✎ Modify]    │
└─────────────────────────────────────┘
```

#### Clarification Requests
```typescript
interface PendingClarify {
  id: string
  question: string
  options?: string[]       // Multiple choice
  required: boolean
}
```

Example:
```
❓ Agent needs clarification:
┌─────────────────────────────────────┐
│ Which AWS region should I deploy    │
│ this Lambda function to?            │
│                                     │
│ ○ us-east-1                        │
│ ○ us-west-2                        │
│ ○ eu-west-1                        │
│ ○ Custom: [_____________]          │
│                                     │
│ [Submit Answer]                     │
└─────────────────────────────────────┘
```

### 10. **Metering & Usage Display**

#### Token Counter
```typescript
interface ChatMeteringData {
  input_tokens: number
  output_tokens: number
  cache_read: number
  cache_write: number
  total_cost: number        // USD
}
```

Real-time display:
```
📊 Session Usage
├─ Input: 1,245 tokens
├─ Output: 3,678 tokens
├─ Cache Hit: 856 tokens
└─ Est. Cost: $0.12
```

Updates after each message completion.

## Technical Implementation

### Component: `ChatView.tsx`
```typescript
interface ChatViewProps {
  agents: AIAgent[]
  initialProfile?: string
  onConvertToIssue: (data: {
    title: string
    description: string
    assignee?: string
  }) => void
}
```

### WebSocket Connection
```typescript
const connectChat = (sessionId: string, profile: string) => {
  const ws = new WebSocket(`ws://127.0.0.1:9120/api/chat/${sessionId}/stream`)
  
  ws.onopen = () => {
    setConnectionState('connected')
  }
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    switch (data.type) {
      case 'token':
        appendToken(data.token)
        break
      case 'thinking':
        setThinking(data.thinking)
        break
      case 'tool_start':
        addToolCall({ ...data, status: 'running' })
        break
      case 'tool_end':
        updateToolCall(data.id, { status: 'complete', output: data.output })
        break
      case 'complete':
        finalizeMessage(data)
        break
    }
  }
  
  ws.onerror = () => {
    setConnectionState('error')
  }
  
  return ws
}
```

### Message Rendering
```typescript
const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  return (
    <div className={clsx('message-bubble', message.role)}>
      <header>
        <Avatar role={message.role} />
        <Timestamp time={message.timestamp} />
      </header>
      
      <div className="message-content">
        {message.role === 'assistant' ? (
          <MarkdownRenderer content={message.text} />
        ) : (
          <p>{message.text}</p>
        )}
      </div>
      
      {message.thinking && (
        <details className="thinking-section">
          <summary>🧠 Thinking process</summary>
          <pre>{message.thinking}</pre>
        </details>
      )}
      
      {message.role === 'assistant' && (
        <footer>
          <button onClick={() => onConvertToIssue(message)}>
            📋 Convert to Task
          </button>
          <button onClick={() => copyMessage(message.text)}>
            📋 Copy
          </button>
        </footer>
      )}
    </div>
  )
}
```

## User Interactions

### Starting a Chat
1. Click "Chat" in sidebar
2. Select profile from dropdown (or use default)
3. Type message in input area
4. Press Ctrl+Enter or click Send

### Continuing Conversation
1. Previous messages load automatically
2. Context maintained across session
3. Scroll to view history
4. Edit previous messages (future)

### Creating Task from Chat
1. Read assistant's response
2. Click "📋 Convert to Task" button
3. New Issue Modal opens with:
   - Title extracted from message
   - Description = full message text
   - Assignee = current profile
4. Customize and save

## Design Tokens (Aura Theme)

### Message Bubbles
```css
/* User message */
.message-bubble.user {
  background: #F97316;
  color: white;
  border-radius: 16px 16px 4px 16px;
  padding: 12px 16px;
  margin-left: auto;
  max-width: 70%;
}

/* Assistant message */
.message-bubble.assistant {
  background: #191C21;
  border: 1px solid #2A2524;
  border-radius: 16px 16px 16px 4px;
  padding: 12px 16px;
  margin-right: auto;
  max-width: 80%;
}
```

### Typography
- **User**: Inter, 14px, white text
- **Assistant**: Geist, 14px, standard text
- **Code**: JetBrains Mono, 13px
- **Thinking**: JetBrains Mono, 12px, muted

## Integration Points

### Backend API Endpoints
```typescript
// Start chat session
POST /api/chat/sessions
{ "profile": "sa-aws" }

// Send message (SSE stream response)
POST /api/chat/{session_id}/messages
{ "content": "Deploy Lambda function" }

// Approve action
POST /api/chat/{session_id}/approve/{approval_id}
{ "approved": true }

// Get session history
GET /api/chat/sessions/{session_id}
```

## Performance Optimizations

1. **Virtual Scrolling**: For 1000+ message sessions
2. **Message Batching**: Group rapid tokens into single render
3. **Lazy Code Highlighting**: Syntax highlight on viewport entry
4. **Debounced Input**: 50ms delay on typing indicator

## Accessibility

- Semantic message structure
- Keyboard navigation between messages
- Screen reader announces new messages
- High contrast message bubbles
- Focus management for approvals

## Future Enhancements
- Multi-agent conversations (group chat)
- Voice input/output
- Image generation integration
- Web search results inline
- Code execution sandbox
- Collaborative editing
- Message reactions
- Thread branching
- Export as PDF/HTML
- Custom system prompts per session
