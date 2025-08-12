# FA2処理シーケンス

このドキュメントでは、Failure Analysis Assistant (FA2)の処理シーケンスを図で説明します。

## 処理シーケンス図

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant Slack as Slack
    participant Lambda as FA2 Lambda
    participant Agent as ReACTエージェント
    participant Tools as 分析ツール群
    participant DynamoDB as DynamoDB (セッション管理)
    participant Bedrock as Amazon Bedrock

    %% 初期リクエスト
    User->>Slack: アラーム通知を確認
    User->>Slack: 障害分析フォームに入力
    Slack->>Lambda: 障害分析リクエスト
    Note over Lambda: 初期化処理<br>・設定読み込み<br>・Slackトークン取得<br>・言語設定

    %% セッション開始
    Lambda->>DynamoDB: セッション状態確認
    alt 新規セッション
        Lambda->>Slack: 分析開始メッセージ送信
        Lambda->>Agent: 初期化 (sessionId, errorDescription, toolRegistry, prompt)
    else 既存セッション
        DynamoDB->>Lambda: セッション状態取得
        Lambda->>Agent: セッション状態設定
    end

    %% ReACTサイクル開始
    rect rgb(200, 220, 255)
        Note over Agent: ReACTサイクル (最大5回)
        
        %% Thinking Step
        Agent->>Bedrock: 思考ステップ (Thinking)
        Note over Agent,Bedrock: 現状分析と次のアクション決定
        Bedrock->>Agent: 思考結果と次のアクション

        %% Acting Step
        Agent->>Tools: 行動ステップ (Acting)
        Note over Agent,Tools: 選択されたツールを実行
        Tools->>Agent: ツール実行結果

        %% Observing Step
        Agent->>Agent: 観察ステップ (Observing)
        Note over Agent: 結果観察と履歴更新
        
        %% サイクルカウント増加
        Agent->>Agent: サイクルカウント増加
    end

    %% セッション状態保存
    Lambda->>DynamoDB: セッション状態保存

    %% 処理分岐
    alt 分析完了
        Agent->>Bedrock: 最終回答生成 (Completing)
        Bedrock->>Agent: 最終回答
        Lambda->>Slack: 分析結果送信 (Markdown)
        Lambda->>DynamoDB: セッション完了処理
        Lambda->>Slack: 分析完了メッセージ送信
    else 分析継続
        Lambda->>Lambda: 次ステップ実行のため自己呼び出し (非同期)
        Lambda->>Slack: 進捗メッセージ送信
    end

    %% エラー処理
    alt エラー発生時
        Lambda->>Slack: エラーメッセージ送信
        Lambda->>Slack: リトライガイダンス送信
    end
```

## 処理フローの説明

1. **初期リクエスト処理**：
   - ユーザーがSlackでアラーム通知を確認し、障害分析フォームに入力
   - FA2 Lambdaが起動し、初期化処理を実行

2. **セッション管理**：
   - 新規セッションの場合は新たにReACTエージェントを初期化
   - 既存セッションの場合は状態を復元

3. **ReACTサイクル**：
   - **思考ステップ（Thinking）**：現状分析と次のアクション決定（Bedrock LLMを使用）
   - **行動ステップ（Acting）**：選択されたツールを実行
   - **観察ステップ（Observing）**：結果観察と履歴更新
   - サイクルカウント増加（最大5回）

4. **処理分岐**：
   - 分析完了：最終回答を生成してSlackに送信
   - 分析継続：次ステップ実行のためLambdaを非同期で再度呼び出し

5. **エラー処理**：
   - エラー発生時はエラーメッセージとリトライガイダンスを送信
