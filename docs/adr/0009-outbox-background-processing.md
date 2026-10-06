# ADR-0009: Transactional outbox for background work

**Status:** Accepted

Answering a question must be fast and correct. Grading, attempt, XP ledger, user/topic progress, streak and roadmap-step completion are committed synchronously in one transaction. Secondary work — achievement evaluation, rank snapshot, realtime notifications — is enqueued as an `OutboxMessage` **in the same transaction** and processed by `OutboxDispatcher` (BackgroundService) which claims rows with `FOR UPDATE SKIP LOCKED`, runs each handler inside a savepoint and retries failures up to 5 times.

This is reliable (no lost events on crash), safe with several API instances, and the handler contract (`IOutboxHandler`) can later be backed by Azure Service Bus without changing the producers.
