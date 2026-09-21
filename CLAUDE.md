# Hermes Agentic Hub

## Design System & UI Guidelines (Aura - Smart AI Assistant)

All frontend UI and design components in this project MUST strictly follow the design template and tokens defined in `aura-smart-ai-assistant-DESIGN.md`.

### Mandatory Design Rules
1. **Design Reference**: Always use `aura-smart-ai-assistant-DESIGN.md` as the source of truth for layout, colors, typography, and component specifications.
2. **Color Palette & Tokens**:
   - **Primary**: `#F97316` (Aura Vibrant Orange) — main CTAs, active highlights, key brand accents.
   - **Accent**: `#FB923C` (Aura Amber / Orange Glow) — hover states, secondary highlights.
   - **Secondary**: `#000000` (Black)
   - **Background**:
     - Light mode: `#FAF9F9` (Warm Aura off-white)
     - Dark mode: `#0F1115` (Warm deep charcoal dark)
   - **Surface**:
     - Dark mode: `#191C21` (Exact Aura surface token for cards, drawers, modals, elevated containers)
     - Light mode: `#FFFFFF`
   - **Borders**:
     - Dark mode: `#2A2524` (Subtle warm charcoal border)
     - Light mode: `#E7E5E4` (Subtle warm stone border)
   - **Text**:
     - Primary: `#111827` (Light) / `#F3F4F6` (Dark)
     - Secondary: `#4B5563` (Light) / `#9CA3AF` (Dark)
     - Muted: `#9CA3AF` (Light) / `#6B7280` (Dark)
3. **Typography**:
   - **Display / Headings**: `'Inter', sans-serif` (`font-display`, weight 500/600/700).
   - **Body**: `'Geist', 'Inter', sans-serif` (`font-body`, weight 400).
   - **Technical Metadata / Labels / Badges / Code**: `'JetBrains Mono', monospace` (`font-mono`, weight 500/600, `text-[11px]` or `text-[12px]`).
4. **Rounded Corners & Geometry**:
   - **Cards, Modals, Columns, Drawers**: `16px` (`rounded-2xl` / `rounded: card`).
   - **Controls, Buttons, Inputs, Selects**: `8px` (`rounded-lg` / `rounded: control`).
   - **Badges, Status Indicators, Toggles**: `9999px` (`rounded-full` / `rounded: pill`).
5. **Atmospheric & Motion Effects**:
   - Maintain the subtle radial orange/amber glow background layer (`.aura-glow-layer`).
   - Cards should have subtle border contrast and gentle hover lift (`hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200`).
   - Keep animations smooth, performant, and restrained.

---

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
