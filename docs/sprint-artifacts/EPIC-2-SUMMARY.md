# Epic 2 Issues - Summary Report

**Date:** 2026-01-03  
**Epic:** Epic 2 - Card Management & Barcode Display  
**Prepared by:** SM Agent (Bob)  
**Status:** ✅ Ready for Issue Creation

---

## 🎯 What Was Done

I've analyzed the epic documentation (`docs/epics.md`) and created comprehensive issue templates for all **8 stories** in Epic 2.

### Files Created

1. **`epic-2-issues.md`** (12KB)
   - Human-readable markdown format
   - Complete issue templates with titles, labels, and descriptions
   - Copy-paste ready for manual issue creation

2. **`epic-2-issues.json`** (12KB)
   - Machine-readable JSON format
   - Structured data for automation
   - Includes metadata and implementation guidance

3. **`create-epic-2-issues.sh`** (2KB, executable)
   - Automated bash script
   - Creates all 8 issues via GitHub CLI (`gh`)
   - Handles authentication checks and error cases

4. **`README-epic-2-issues.md`** (4.3KB)
   - Complete usage guide
   - Three methods for creating issues (automated, manual, CLI)
   - Technical context and next steps

---

## 📋 Epic 2 Stories Overview

| # | Story | Priority | Type |
|---|-------|----------|------|
| 2.1 | Display Card List | 🔴 High | UI Foundation |
| 2.2 | Add Card Manually | 🔴 High | Core Feature |
| 2.3 | Scan Barcode with Camera | 🟡 Medium | Enhancement |
| 2.4 | Display Virtual Logo | 🟡 Medium | Visual Polish |
| 2.5 | Display Barcode (Barcode Flash) | 🔴 Critical | Core Value |
| 2.6 | View Card Details | 🟡 Medium | Management |
| 2.7 | Edit Card | 🟡 Medium | Management |
| 2.8 | Delete Card | 🟡 Medium | Management |

**Total:** 8 stories covering FR1-FR7, FR9-FR13, FR48-FR51, FR59-FR65

---

## 🚀 How to Create the Issues

### Option 1: Automated (Fastest) ✨

```bash
cd docs/sprint-artifacts
./create-epic-2-issues.sh ifero/myLoyaltyCards
```

**Requirements:**
- GitHub CLI (`gh`) installed
- Authenticated with GitHub (`gh auth login`)
- `jq` installed for JSON parsing

**Result:** All 8 issues created in ~10 seconds with proper labels

### Option 2: Manual (Most Control)

1. Open `docs/sprint-artifacts/epic-2-issues.md`
2. For each issue section:
   - Copy the title
   - Copy the full description
   - Create new GitHub issue
   - Add specified labels
   - Paste content

**Time:** ~5-10 minutes per issue (40-80 minutes total)

### Option 3: GitHub CLI (Individual)

Create issues one by one using `gh` commands. See `README-epic-2-issues.md` for examples.

---

## 📊 Implementation Recommendations

### Suggested Development Order

1. **Sprint 1: Foundation** (Stories 2.1, 2.2)
   - Display Card List
   - Add Card Manually
   - Estimated: 5-8 days

2. **Sprint 2: Core Value** (Stories 2.5, 2.4)
   - Display Barcode (Barcode Flash) ← CRITICAL
   - Display Virtual Logo
   - Estimated: 3-5 days

3. **Sprint 3: Management** (Stories 2.6, 2.7, 2.8)
   - View Card Details
   - Edit Card
   - Delete Card
   - Estimated: 4-6 days

4. **Sprint 4: Enhancement** (Story 2.3)
   - Scan Barcode with Camera
   - Estimated: 3-4 days

**Total Estimated Time:** 15-23 days (3-4.5 weeks)

### Dependencies

All Epic 2 stories depend on **Epic 1 foundation**:
- ✅ Story 1.3: Core Data Schema (Zod schemas)
- ✅ Story 1.4: Set Up Local Database (expo-sqlite)
- ✅ Story 1.5: Build App Shell with Header Navigation

---

## 🎨 Labels Applied

Each issue includes appropriate labels:

- **`epic-2`** - Epic identifier
- **`story`** - User story type
- **`phase-1`** - Phase 1 MVP
- **`mvp`** - Required for MVP
- **`UI`** - User interface work (Stories 2.1, 2.4, 2.6)
- **`feature`** - New functionality (Stories 2.2, 2.3, 2.5, 2.7, 2.8)
- **`camera`** - Requires camera permissions (Story 2.3)
- **`critical`** - Core product value (Story 2.5)

---

## 📝 Issue Template Quality

Each issue includes:

✅ **User Story** - Clear "As a... I want... So that..." format  
✅ **Acceptance Criteria** - Given/When/Then scenarios  
✅ **Technical Notes** - Implementation details and constraints  
✅ **Related** - Dependencies and epic linkage  
✅ **Labels** - Proper categorization  

---

## 🔄 Next Steps (BMAD Workflow)

After creating GitHub issues:

1. **Update Sprint Status**
   ```yaml
   # docs/sprint-artifacts/sprint-status.yaml
   epic-2: in-progress  # When first story starts
   ```

2. **Create Story Drafts** (Use SM agent)
   ```
   *create-story
   ```
   - Creates detailed story drafts in `docs/sprint-artifacts/stories/`
   - Adds context from PRD, architecture, and epics
   - Prepares for development handoff

3. **Sprint Planning** (Use SM agent)
   ```
   *sprint-planning
   ```
   - Updates sprint-status.yaml
   - Tracks progress across all epics

4. **Development** (Use DEV agent)
   - Developers pick up stories marked `ready-for-dev`
   - Implement according to story context
   - Move to `review` when complete

---

## ✅ Verification Checklist

Before creating issues, verify:

- [ ] GitHub CLI installed (`gh --version`)
- [ ] GitHub authenticated (`gh auth status`)
- [ ] Write access to `ifero/myLoyaltyCards` repository
- [ ] `jq` installed for JSON parsing (if using script)
- [ ] Epic 1 stories created (dependencies)
- [ ] Ready to start Epic 2 implementation

---

## 💡 Pro Tips

1. **Batch Create:** Use the automated script to create all issues at once
2. **Epic Label:** Filter GitHub issues by `label:epic-2` to see all Epic 2 work
3. **Milestone:** Consider creating a "Phase 1 MVP" milestone and assigning these issues
4. **Story Drafts:** Create story drafts progressively as you complete previous stories
5. **Dependencies:** Review Epic 1 completion before starting Epic 2 stories

---

## 📚 Reference Documents

- **Epic Details:** `docs/epics.md` (lines 464-668)
- **Product Requirements:** `docs/prd.md`
- **Architecture:** `docs/architecture.md`
- **Technical Rules:** `docs/project_context.md`
- **Sprint Status:** `docs/sprint-artifacts/sprint-status.yaml`

---

## 🤝 Questions?

If you need clarification on any story:
1. Reference the original epic document: `docs/epics.md`
2. Review the PRD for functional requirements: `docs/prd.md`
3. Check technical context: `docs/project_context.md`
4. Use SM agent's `*party-mode` to discuss with other experts

---

**Ready to create issues?** Run the script or start copying from `epic-2-issues.md`!

**Status:** ✅ Complete - All Epic 2 issue templates ready for GitHub

---

_Generated by SM Agent (Bob) - 2026-01-03_
