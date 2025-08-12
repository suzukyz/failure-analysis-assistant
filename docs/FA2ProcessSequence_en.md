# FA2 Process Sequence

This document explains the process sequence of Failure Analysis Assistant (FA2) with a diagram.

## Process Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant Slack
    participant Lambda as FA2 Lambda
    participant Agent as ReACT Agent
    participant Tools as Analysis Tools
    participant DynamoDB as DynamoDB (Session Management)
    participant Bedrock as Amazon Bedrock

    %% Initial Request
    User->>Slack: Check alarm notification
    User->>Slack: Fill in failure analysis form
    Slack->>Lambda: Failure analysis request
    Note over Lambda: Initialization<br>・Load configuration<br>・Get Slack token<br>・Language settings

    %% Session Start
    Lambda->>DynamoDB: Check session state
    alt New Session
        Lambda->>Slack: Send analysis start message
        Lambda->>Agent: Initialize (sessionId, errorDescription, toolRegistry, prompt)
    else Existing Session
        DynamoDB->>Lambda: Get session state
        Lambda->>Agent: Set session state
    end

    %% ReACT Cycle Start
    rect rgb(200, 220, 255)
        Note over Agent: ReACT Cycle (Max 5 times)
        
        %% Thinking Step
        Agent->>Bedrock: Thinking Step
        Note over Agent,Bedrock: Analyze current situation and decide next action
        Bedrock->>Agent: Thinking result and next action

        %% Acting Step
        Agent->>Tools: Acting Step
        Note over Agent,Tools: Execute selected tool
        Tools->>Agent: Tool execution result

        %% Observing Step
        Agent->>Agent: Observing Step
        Note over Agent: Observe results and update history
        
        %% Increment Cycle Count
        Agent->>Agent: Increment cycle count
    end

    %% Save Session State
    Lambda->>DynamoDB: Save session state

    %% Process Branch
    alt Analysis Complete
        Agent->>Bedrock: Generate final answer (Completing)
        Bedrock->>Agent: Final answer
        Lambda->>Slack: Send analysis result (Markdown)
        Lambda->>DynamoDB: Complete session
        Lambda->>Slack: Send analysis complete message
    else Analysis Continues
        Lambda->>Lambda: Self-invoke for next step (async)
        Lambda->>Slack: Send progress message
    end

    %% Error Handling
    alt Error Occurs
        Lambda->>Slack: Send error message
        Lambda->>Slack: Send retry guidance
    end
```

## Process Flow Description

1. **Initial Request Processing**:
   - User checks alarm notification in Slack and fills in the failure analysis form
   - FA2 Lambda starts and performs initialization

2. **Session Management**:
   - For new sessions, initialize a new ReACT agent
   - For existing sessions, restore the state

3. **ReACT Cycle**:
   - **Thinking Step**: Analyze current situation and decide next action (using Bedrock LLM)
   - **Acting Step**: Execute selected tool
   - **Observing Step**: Observe results and update history
   - Increment cycle count (maximum 5 cycles)

4. **Process Branch**:
   - Analysis Complete: Generate final answer and send to Slack
   - Analysis Continues: Invoke Lambda asynchronously for next step

5. **Error Handling**:
   - Send error message and retry guidance when errors occur
