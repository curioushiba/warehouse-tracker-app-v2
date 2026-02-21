# Settings Page Design

## Overview
Admin settings page for inventory tracker app with alert configuration and display preferences.

## Scope

### Card 1: Alert Settings
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Enable Low Stock Alerts | toggle | on | Send alerts when stock is low |
| Enable Critical Alerts | toggle | on | Send alerts when critical |
| Auto-reorder Point | number input | 15 | Suggested reorder quantity |

### Card 2: Display Settings
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| Dark Mode | toggle | off | Toggle dark/light theme |

## Technical Approach

**Data Persistence:** Mock data pattern (consistent with existing app)

**Files to create:**
1. `src/app/admin/settings/page.tsx` — Settings page UI
2. `src/data/mockSettings.ts` — Default settings data
3. `src/contexts/SettingsContext.tsx` — Settings provider for app-wide access

**Files to modify:**
- Theme handling to respect dark mode setting

## UI Pattern
- Follow existing admin page Card layout
- Use existing UI components (Card, Toggle, Input)
- Match styling of other admin pages
