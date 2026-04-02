# Factory Operations — Build Phases

## Phase 1 — API ↔ Kafka ✅

**Goal:** Get the `factory-operations-api` connected to Kafka so it can publish commands and receive state.

### Changes
- `docker-compose.yml`: Added `bitnami/kafka:3.6` in KRaft mode (no Zookeeper)
  - Internal listener: `kafka:29092` (service-to-service)
  - External listener: `localhost:9092` (host-machine tooling)
  - Fixed pre-existing bug: `DATA_SERVICE_URL` in `report-service` pointed to `http://data-service:3300`, corrected to `http://factory-operations-api:3300`
- `factory-operations-api/package.json`: Added `kafkajs` dependency
- `factory-operations-api/src/kafka/client.ts`: KafkaJS singleton, reads `KAFKA_BROKER` env var
- `factory-operations-api/src/kafka/producer.ts`: Connects producer; `publishCommand(type, factoryId, payload)` publishes to `factory.command` topic
- `factory-operations-api/src/kafka/consumer.ts`: Subscribes to `factory.state`; caches latest per-factory state in memory; exposes `getFactoryState()` and `getAllFactoryStates()`
- `factory-operations-api/src/index.ts`: Async `start()` boots MongoDB → Kafka producer → Kafka consumer before opening HTTP port; graceful `SIGTERM` disconnect

---

## Phase 2 — Orchestrator ✅

**Goal:** Build the `factory-operations-orchestrator` service that bridges `factory.command` → logic → `factory.state`.

### Plan
- New top-level directory: `factory-operations-orchestrator/`
- `package.json` + `tsconfig.json` (TypeScript, kafkajs, no Express needed)
- `src/kafka/client.ts`: KafkaJS singleton (same pattern as API)
- `src/kafka/consumer.ts`: Consumes `factory.command` topic, dispatches to command handlers
- `src/kafka/producer.ts`: Publishes state snapshots to `factory.state` topic
- `src/state/factoryState.ts`: In-memory store of all factory instances and their current state
- `src/handlers/`: One handler per command type:
  - `startFactory`, `stopFactory`, `assignWorker`, `resetFactory`, `increaseOutput`, `decreaseOutput`
- `src/index.ts`: Entry point — connect Kafka, start consumer, handle `SIGTERM`
- `Dockerfile`
- Entry in `docker-compose.yml` with `KAFKA_BROKER=kafka:29092`, `depends_on: kafka`

---

## Phase 3 — API Routes Publish Commands ⬜

**Goal:** Wire `publishCommand()` into existing REST route handlers so HTTP actions flow into Kafka.

### Plan
- `factories.ts` routes: POST actions (start, stop, reset, increase/decrease output) call `publishCommand()` and return the command acknowledgement
- `workers.ts` routes: assign-worker action calls `publishCommand()`
- Add shared command-type constants (e.g. `src/kafka/commandTypes.ts`)
- Routes return `202 Accepted` with the `commandId` so callers can correlate async results

---

## Phase 4 — Per-Factory Topics + Ephemeral Containers ⬜

**Goal:** Implement the per-factory event stream and the logic inside `factory`, `conveyor`, and `worker` containers.

### Plan
- Per-factory topic: `factory.<factoryId>.operations`
- Orchestrator relays commands down to the per-factory topic after handling them
- Implement runtime logic in `factory-operations/factory/`, `conveyor/`, `worker/`
- Each container subscribes/publishes only to `factory.<factoryId>.operations`
- Orchestrator dynamically starts/stops these containers via Docker API or `docker compose` commands

---

## Key Reference

| Item | Value |
|------|-------|
| Internal Kafka | `kafka:29092` |
| External Kafka | `localhost:9092` |
| MongoDB URI | `mongodb://mongodb:27017/factory-operations` |
| API port | `3300` |
| File service port | `3100` |
| Report service port | `3200` |
| Docker network | `app-network` |
| `factory.command` publisher | `factory-operations-api` |
| `factory.command` subscriber | `factory-operations-orchestrator` |
| `factory.state` publisher | `factory-operations-orchestrator` |
| `factory.state` subscriber | `factory-operations-api` |
