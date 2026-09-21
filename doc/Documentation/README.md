# Hermes Agentic Hub - Feature Documentation Index

## Overview
Complete documentation for all features in the Hermes Agentic Hub, a Linear/Multica-inspired command center for human-in-the-loop AI agent orchestration.

## Quick Navigation

### 📊 Core Views
- [**01. Kanban Board**](01-kanban-board.md) - Interactive drag-and-drop task management
- [**02. Table View**](02-table-view.md) - Spreadsheet-style task listing with multi-select
- [**03. Task Detail Modal**](03-task-detail-modal.md) - Comprehensive task inspection with execution logs
- [**04. Inbox View**](04-inbox-view.md) - Human-in-the-loop review center

### ⚡ Task Management
- [**05. Bulk Operations**](05-bulk-operations.md) - Multi-select and batch task operations
- [**10. Global Search**](10-global-search.md) - Quick find for tasks, projects, agents (Ctrl+K)

### 🤖 AI Orchestration
- [**06. Chat View**](06-chat-view.md) - Real-time AI conversation with streaming responses
- [**07. AI Team Management**](07-ai-team-management.md) - Agents, Squads, and Skills
- [**09. Autopilot Scheduler**](09-autopilot-scheduler.md) - Cron-based automated task execution

### 🏗️ Project Management
- [**08. Projects & Boards**](08-projects-boards.md) - Multi-workspace organization

### 🔧 System Features
- [**11. Real-time Updates**](11-realtime-updates.md) - WebSocket streaming and live data sync
- [**12. Theme System**](12-theme-system.md) - Dark/Light mode with Aura design tokens
- [**13. Rich Content Rendering**](13-rich-content-rendering.md) - Markdown, Mermaid, code highlighting

## Feature Matrix

| Feature | Status | Keyboard Shortcut | API Integration |
|---------|--------|-------------------|-----------------|
| Kanban Board | ✅ Active | `B` | WebSocket + REST |
| Table View | ✅ Active | `T` | WebSocket + REST |
| Task Details | ✅ Active | Click card | REST |
| Inbox Review | ✅ Active | `I` | REST |
| Bulk Operations | ✅ Active | `Ctrl+A` | REST |
| Global Search | ✅ Active | `Ctrl+K` | Client-side |
| Chat Interface | ✅ Active | - | SSE Stream |
| Agents View | ✅ Active | - | REST |
| Squads View | ✅ Active | - | REST |
| Skills View | ✅ Active | - | REST |
| Projects View | ✅ Active | - | REST |
| Autopilot Jobs | ✅ Active | - | REST |
| Dark/Light Theme | ✅ Active | - | LocalStorage |
| Mermaid Diagrams | ✅ Active | - | Client-side |
| Code Highlighting | ✅ Active | - | Prism.js |

## By User Role

### 👨‍💼 Project Managers
- [Projects & Boards](08-projects-boards.md) - Organize work across workspaces
- [Kanban Board](01-kanban-board.md) - Visual workflow management
- [Autopilot Scheduler](09-autopilot-scheduler.md) - Automate recurring tasks
- [Inbox View](04-inbox-view.md) - Review and approve agent work

### 👨‍💻 Developers
- [Task Detail Modal](03-task-detail-modal.md) - Deep dive into execution logs
- [Chat View](06-chat-view.md) - Direct AI assistance
- [Table View](02-table-view.md) - Efficient task processing
- [Global Search](10-global-search.md) - Quick navigation

### 🤖 AI Operations
- [AI Team Management](07-ai-team-management.md) - Configure agents and squads
- [Real-time Updates](11-realtime-updates.md) - Monitor live execution
- [Autopilot Scheduler](09-autopilot-scheduler.md) - Schedule automated workflows

## By Use Case

### 🚀 Getting Started
1. Read [Theme System](12-theme-system.md) to understand the UI
2. Learn [Kanban Board](01-kanban-board.md) basics
3. Create your first task using [Task Detail Modal](03-task-detail-modal.md)
4. Explore [Global Search](10-global-search.md) with `Ctrl+K`

### 📋 Task Management
1. [Kanban Board](01-kanban-board.md) - Visual task organization
2. [Table View](02-table-view.md) - Dense information display
3. [Bulk Operations](05-bulk-operations.md) - Efficient batch updates
4. [Global Search](10-global-search.md) - Find tasks instantly

### 🤖 AI Collaboration
1. [Chat View](06-chat-view.md) - Direct conversation with agents
2. [AI Team Management](07-ai-team-management.md) - Configure agent profiles
3. [Autopilot Scheduler](09-autopilot-scheduler.md) - Automate routine work
4. [Inbox View](04-inbox-view.md) - Review and approve results

### 🏗️ Workspace Setup
1. [Projects & Boards](08-projects-boards.md) - Create workspaces
2. [AI Team Management](07-ai-team-management.md) - Set up agent team
3. [Autopilot Scheduler](09-autopilot-scheduler.md) - Configure automation
4. [Theme System](12-theme-system.md) - Customize appearance

## Keyboard Shortcuts Reference

| Shortcut | Action | Documentation |
|----------|--------|---------------|
| `Ctrl/Cmd + K` | Open global search | [Global Search](10-global-search.md) |
| `Ctrl/Cmd + A` | Select all tasks | [Bulk Operations](05-bulk-operations.md) |
| `C` | Create new issue | [Kanban Board](01-kanban-board.md) |
| `B` | Switch to Board view | [Kanban Board](01-kanban-board.md) |
| `T` | Switch to Table view | [Table View](02-table-view.md) |
| `I` | Open Inbox | [Inbox View](04-inbox-view.md) |
| `Esc` | Close modal / Clear selection | All views |
| `↑ / ↓` | Navigate results | [Global Search](10-global-search.md) |
| `Enter` | Select / Submit | All modals |
| `Ctrl + Enter` | Send message | [Chat View](06-chat-view.md) |

## API Integration Overview

### REST Endpoints
All documented in respective feature pages:
- **Kanban API**: Task CRUD, status updates
- **Profiles API**: Agent management
- **Cron API**: Autopilot jobs
- **Skills API**: Capability catalog
- **Boards API**: Project management

### Real-time Communication
- **WebSocket**: `/events` - Task updates, worker status
- **SSE**: `/chat/{id}/stream` - Chat message streaming

See [Real-time Updates](11-realtime-updates.md) for details.

## Design System

### Aura Theme
All UI components follow the Aura design system:
- **Colors**: Orange primary (#F97316), warm dark backgrounds
- **Typography**: Inter (display), Geist (body), JetBrains Mono (code)
- **Spacing**: Consistent 4px grid system
- **Borders**: 16px cards, 8px controls, pill badges

See [Theme System](12-theme-system.md) for complete tokens.

### Component Patterns
- **Cards**: 16px radius, subtle borders, hover lift
- **Buttons**: 8px radius, primary orange, clear states
- **Modals**: Centered, backdrop blur, focus trap
- **Tables**: Sticky headers, zebra rows, hover highlight

## Performance Characteristics

| Feature | Load Time | Memory | Notes |
|---------|-----------|--------|-------|
| Kanban Board | <200ms | ~5MB | 100 tasks |
| Table View | <150ms | ~4MB | 100 tasks |
| Task Detail | <100ms | ~2MB | With attachments |
| Chat Stream | Real-time | ~3MB | Per session |
| Global Search | <50ms | ~1MB | Client-side |
| WebSocket | - | ~1MB | Per connection |

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+ (Recommended)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Required Features
- WebSocket API
- Server-Sent Events (SSE)
- CSS Grid & Flexbox
- LocalStorage
- ES2020+ JavaScript

## Accessibility

All features comply with WCAG 2.1 AA standards:
- Keyboard navigation support
- Screen reader compatible
- High contrast mode
- Focus indicators
- Semantic HTML
- ARIA labels

See individual feature docs for specifics.

## Contributing

### Adding New Features
1. Follow Aura design tokens ([Theme System](12-theme-system.md))
2. Implement keyboard shortcuts where applicable
3. Add WebSocket integration for real-time updates
4. Document in `doc/Documentation/`
5. Update this index

### Documentation Standards
- Clear overview and key features
- Code examples with TypeScript
- User interaction workflows
- Design token references
- API integration details
- Accessibility notes
- Future enhancements section

## Related Documentation

### Project Root
- [Main README](../../README.md) - Project overview and setup
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines

### Planning & Architecture
- [Product Requirements Document](../PRD.md) - Business requirements
- [Technical Documentation](../DOCUMENTATION.md) - Architecture details

### Design Reference
- [Aura Design System](../../aura-smart-ai-assistant-DESIGN.md) - Complete design spec

## Version History

| Version | Date | Features Added |
|---------|------|----------------|
| v2.5 | 2026-09-21 | Mermaid viewer, Table view, Bulk operations, SSE streaming |
| v2.0 | 2026-09 | Native Hermes integration, Multi-board support |
| v1.0 | 2026-08 | Initial release with Kanban board |

## Support

### Troubleshooting
- **WebSocket not connecting**: Check backend is running on port 9120
- **Theme not persisting**: Clear browser cache and localStorage
- **Search not working**: Refresh page to reload task data
- **Chat not streaming**: Verify SSE endpoint `/api/chat/{id}/messages`

### Common Issues
See individual feature documentation for specific troubleshooting.

---

**Last Updated**: September 21, 2026  
**Documentation Version**: 2.5  
**Project**: Hermes Agentic Hub  
**Repository**: `/home/sigit/hermes-agentic-hub`
