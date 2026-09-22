# GLITCH 36 Workflow Diagrams (Phase 1 Discovery)

These step-by-step flows describe the major processes on the live website based on source-code and authenticated route discovery.

## 1. Participant Registration Flow
```mermaid
graph TD
    A[Public Landing Page] -->|Click Register| B(Registration Wizard)
    B --> C{Is Registration Open?}
    C -- No --> D[Show Registration Closed Error]
    C -- Yes --> E[Fill Personal Info]
    E --> F[Select Participant Type]
    F --> G[Firebase Authentication]
    G --> H[Create Firestore Profile]
    H --> I[Redirect to Dashboard]
```

## 2. Team Management Flow
```mermaid
graph TD
    A[Participant Dashboard] -->|Navigate| B(Team Management Page)
    B --> C{Has Team?}
    C -- Yes --> D[View Team Dashboard]
    D --> E[Manage Members/Leave Team]
    C -- No --> F[Options]
    F -->|Create| G[Enter Team Name]
    G --> H[Generate Join Code]
    F -->|Join| I[Enter Join Code]
    I --> J[Validate Code]
    J --> K[Add to Team Document]
```

## 3. Project Submission Flow
```mermaid
graph TD
    A[Participant Dashboard] -->|Navigate| B(Submission Page)
    B --> C{Are Submissions Open?}
    C -- No --> D[Show Closed Notice]
    C -- Yes --> E{Is User in a Team?}
    E -- No --> F[Prompt to Join Team]
    E -- Yes --> G[Enter GitHub URL]
    G --> H[Enter Video/Demo URL]
    H --> I[Save Submission to Firestore]
```

## 4. Admin Judging Flow
```mermaid
graph TD
    A[Admin Workspace] -->|Navigate| B(Evaluation Manager)
    B --> C[View All Submitted Projects]
    C --> D[Select Team]
    D --> E[Open Scoring Rubric]
    E --> F[Input Scores]
    F --> G[Save to Team Document]
    G --> H[Update Results Manager]
```

## 5. Admin Certificate Generation
```mermaid
graph TD
    A[Admin Workspace] -->|Navigate| B(Certificates Manager)
    B --> C[Select Certificate Type/Template]
    C --> D[Select Participants/Teams]
    D --> E[Trigger Cloud Function]
    E --> F[Generate PDF/Asset]
    F --> G[Save Asset URL to Profile]
    G --> H[Visible on Participant Dashboard]
```
