# Epic 2 Issues - Creation Guide

This directory contains issue templates for **Epic 2: Card Management & Barcode Display**.

## Files

- **`epic-2-issues.md`** - Human-readable issue templates with full formatting
- **`epic-2-issues.json`** - Machine-readable JSON format for automation
- **`create-epic-2-issues.sh`** - Automated script to create all issues via GitHub CLI

## Quick Start

### Option 1: Automated Creation (Recommended)

If you have GitHub CLI (`gh`) installed and authenticated:

```bash
# From the project root
cd docs/sprint-artifacts
./create-epic-2-issues.sh ifero/myLoyaltyCards
```

This will create all 8 issues automatically with proper labels and formatting.

### Option 2: Manual Creation

1. Open `epic-2-issues.md`
2. For each issue section:
   - Copy the title
   - Copy the description
   - Create a new GitHub issue
   - Add the specified labels
   - Paste the content

### Option 3: GitHub CLI (Individual Issues)

Create issues one by one:

```bash
# Example for Story 2.1
gh issue create \
  --repo ifero/myLoyaltyCards \
  --title "[Epic 2] Story 2.1: Display Card List" \
  --label "epic-2,story,phase-1,mvp,UI" \
  --body-file <(jq -r '.issues[0].body' epic-2-issues.json)
```

## Epic 2 Overview

**Goal:** Users can add their loyalty cards and display their barcodes at checkout — the core product value.

**Phase:** 1 (MVP)

**Total Stories:** 8

### Story List

| Story | Title | Priority | Dependencies |
|-------|-------|----------|--------------|
| 2.1 | Display Card List | High | Epic 1 (1.4, 1.5) |
| 2.2 | Add Card Manually | High | Epic 1 (1.3, 1.4, 1.5) |
| 2.3 | Scan Barcode with Camera | Medium | Story 2.2 |
| 2.4 | Display Virtual Logo | Medium | Story 2.1 |
| 2.5 | Display Barcode (Barcode Flash) | Critical | Story 2.1 |
| 2.6 | View Card Details | Medium | Story 2.5 |
| 2.7 | Edit Card | Medium | Story 2.6, 2.2 |
| 2.8 | Delete Card | Medium | Story 2.6 |

### Suggested Implementation Order

1. **Foundation** (Stories 2.1, 2.2)
   - Display Card List
   - Add Card Manually

2. **Core Value** (Story 2.5)
   - Display Barcode (Barcode Flash)

3. **Visual Polish** (Story 2.4)
   - Display Virtual Logo

4. **Management Features** (Stories 2.6, 2.7, 2.8)
   - View Card Details
   - Edit Card
   - Delete Card

5. **Enhancement** (Story 2.3)
   - Scan Barcode with Camera (can be added later if needed)

## Labels Used

- **`epic-2`** - All stories in this epic
- **`story`** - User story (vs task or bug)
- **`phase-1`** - Phase 1 MVP work
- **`mvp`** - Required for minimum viable product
- **`UI`** - User interface focused
- **`feature`** - New functionality
- **`camera`** - Requires camera permissions
- **`critical`** - Core product value

## Tracking Progress

After creating issues, update the sprint status file:

```yaml
# docs/sprint-artifacts/sprint-status.yaml
epic-2: in-progress  # Update when first story is created
2-1-display-card-list: drafted  # Update as stories progress
2-2-add-card-manually: backlog
# ... etc
```

### Story Status Flow

```
backlog → drafted → ready-for-dev → in-progress → review → done
```

## Next Steps After Creating Issues

1. **Review Issues** - Check all issues on GitHub, adjust as needed
2. **Draft Stories** - Use SM agent's `*create-story` workflow to create detailed story drafts
3. **Epic Planning** - Run SM agent's `*sprint-planning` to update sprint-status.yaml
4. **Development** - Assign stories to developers and start implementation

## SM Agent Workflow

For proper BMAD/BMM workflow integration:

```bash
# Load SM agent in your IDE
# Then use the menu:

*create-story    # Create draft for each story
*sprint-planning # Update sprint-status.yaml after epics are ready
```

## Technical Context

All stories should follow the technical standards in:
- `docs/project_context.md` - Critical implementation rules
- `docs/architecture.md` - Technical architecture
- `docs/prd.md` - Product requirements
- `docs/epics.md` - Epic and story details

## Questions or Issues?

If you encounter problems:
1. Check that GitHub CLI is installed and authenticated
2. Verify you have write access to the repository
3. Review the error messages for specific issues
4. Consult the BMAD documentation in `.bmad/bmm/docs/`

---

Created: 2026-01-03
Epic: 2 - Card Management & Barcode Display
Author: SM Agent (Bob)
