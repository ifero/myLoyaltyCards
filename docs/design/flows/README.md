# Flows

User and screen flows as **Mermaid-in-markdown**. Author each flow as a `.md` file with a
fenced `mermaid` block so it renders natively on GitHub and diffs as plain text.

Example:

````markdown
# Add-card flow

```mermaid
flowchart TD
  A[Home] --> B[Tap +]
  B --> C[Scan barcode]
  C --> D[Confirm & save]
  D --> A
```
````

See [`../CONTRIBUTING-DESIGN.md`](../CONTRIBUTING-DESIGN.md) for the contribution workflow.
