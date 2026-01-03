#!/bin/bash

# Script to create GitHub issues for Epic 2 from JSON data
# Usage: ./create-epic-2-issues.sh [repository]
# Example: ./create-epic-2-issues.sh ifero/myLoyaltyCards

set -e

REPO="${1:-ifero/myLoyaltyCards}"
ISSUES_JSON="docs/sprint-artifacts/epic-2-issues.json"

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

# Check if JSON file exists
if [ ! -f "$ISSUES_JSON" ]; then
    echo "Error: Issues JSON file not found at $ISSUES_JSON"
    exit 1
fi

echo "Creating GitHub issues for Epic 2 in repository: $REPO"
echo "---"

# Parse JSON and create issues using jq
if ! command -v jq &> /dev/null; then
    echo "Error: jq is not installed. Install it to parse JSON."
    echo "On macOS: brew install jq"
    echo "On Ubuntu: sudo apt-get install jq"
    exit 1
fi

# Read the number of issues
ISSUE_COUNT=$(jq '.issues | length' "$ISSUES_JSON")

echo "Found $ISSUE_COUNT issues to create"
echo "---"

# Create each issue
for i in $(seq 0 $((ISSUE_COUNT - 1))); do
    TITLE=$(jq -r ".issues[$i].title" "$ISSUES_JSON")
    BODY=$(jq -r ".issues[$i].body" "$ISSUES_JSON")
    LABELS=$(jq -r ".issues[$i].labels | join(\",\")" "$ISSUES_JSON")
    
    echo "Creating issue: $TITLE"
    
    # Create the issue
    ISSUE_URL=$(gh issue create \
        --repo "$REPO" \
        --title "$TITLE" \
        --body "$BODY" \
        --label "$LABELS")
    
    echo "✓ Created: $ISSUE_URL"
    echo "---"
    
    # Small delay to avoid rate limiting
    sleep 1
done

echo "All issues created successfully!"
echo ""
echo "Next steps:"
echo "1. Review the created issues on GitHub"
echo "2. Update sprint-status.yaml as stories progress"
echo "3. Use SM agent's *create-story workflow to draft stories"
