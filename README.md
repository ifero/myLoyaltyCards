# myLoyaltyCards

A mobile app for managing loyalty cards

## BMAD-METHOD Integration

This project uses [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (Breakthrough Method of Agile AI-Driven Development) for spec-driven development.

### What is BMAD?

BMAD is a framework that utilizes specialized AI agents to manage the complete agile development cycle:

- **Analyst** - Requirements gathering and analysis
- **PM (Product Manager)** - Product planning and prioritization
- **Architect** - System design and technical decisions
- **Dev (Developer)** - Implementation and coding
- **QA (Quality Assurance)** - Testing and quality control
- **SM (Scrum Master)** - Sprint planning and process management

### Using BMAD in This Project

The BMAD framework is installed in the `.bmad-core/` directory with the following structure:

```
.bmad-core/
├── agents/           # AI agent definitions
├── tasks/            # Executable tasks
├── templates/        # Document templates (PRD, architecture, stories)
├── checklists/       # Quality checklists
├── data/             # Knowledge base and technical preferences
├── workflows/        # Workflow definitions
├── core-config.yaml  # Project configuration
└── user-guide.md     # Detailed usage guide
```

### Getting Started with BMAD

1. **Read the User Guide**: Start by reading `.bmad-core/user-guide.md` for detailed instructions
2. **Review Technical Preferences**: Check `.bmad-core/data/technical-preferences.md` for the project's tech stack
3. **Use the Agents**: Invoke BMAD agents in your AI IDE to assist with various development tasks

### Tech Stack

- **Frontend Framework**: React Native / Expo
- **Navigation**: Expo Router
- **Language**: TypeScript
- **Styling**: StyleSheet / NativeWind (optional)

### Documentation

For more information about BMAD-METHOD, visit:

- [BMAD-METHOD Official Repository](https://github.com/bmad-code-org/BMAD-METHOD)

## Apple Watch Sync Architecture (Overview)

The Apple Watch companion app for myLoyaltyCards è progettata per essere **read-only**: tutte le modifiche (aggiunta, modifica, eliminazione carte) avvengono solo sull’app iPhone. La sincronizzazione avviene tramite WatchConnectivity:

- **Flusso di sync**: quando una carta viene aggiunta/modificata/eliminata su iPhone, l’app invia un messaggio di sync al Watch contenente la versione e il payload della carta.
- **Gestione conflitti**: la logica last-write-wins viene applicata lato telefono prima dell’invio; il Watch accetta sempre l’ultimo payload ricevuto.
- **Retry e resilienza**: se il Watch non è connesso, il telefono effettua retry con backoff (fino a 3 tentativi) e logga eventuali errori.
- **Storage locale**: il Watch salva le carte ricevute in UserDefaults/SwiftData, ma non permette modifiche locali.
- **Read-only enforcement**: la UI e il modello CardStore non espongono azioni di modifica; eventuali tentativi di scrittura sono ignorati.

### Diagramma di flusso (semplificato)

```
Phone (iOS)                Watch (watchOS)
    |   add/edit/delete        |
    |------------------------>|  (sync message: {version, card payload, brandId})
    |                         |
    |<------------------------|  (ack)
    |   retry on failure      |
```

Per dettagli implementativi, vedi:

- core/watch-connectivity.ts
- CardListView.swift
- CardStoreTests.swift
