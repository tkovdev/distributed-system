# Factory Operations — Distributed System

## Overview

A hands-on learning project for **Docker** and **Apache Kafka**. The system models a network of factories, each with conveyors and workers, operated through an event-driven architecture. HTTP commands enter through a REST API, flow through Kafka to an orchestrator, which then spins up and coordinates ephemeral per-factory containers. State is broadcast back through Kafka so the API can serve reads without coupling directly to any factory process.

---

## How the System Orchestrates Itself

![Deployment Diagram](Ownership%20Deployment-Diagram.jpg)

### Flow

1. **User** calls a REST endpoint (e.g. `POST /factories/:id/start`).
2. **API** publishes a command to the `factory.command` Kafka topic and immediately returns `202 Accepted` with a `commandId`.
3. **Orchestrator** consumes `factory.command`, updates its in-memory state, and uses the Docker API to start/stop ephemeral containers (`factory-process`, `conveyor-process`, `worker-process`).
4. Ephemeral containers publish events to `factory.<factoryId>.operations` — a dedicated topic per factory instance.
5. **Orchestrator** listens on each per-factory topic and publishes state snapshots to `factory.state`.
6. **API** consumer caches the latest snapshot from `factory.state` so GET endpoints can respond immediately without querying the orchestrator.

### Kafka Topics

| Topic | Publisher | Subscriber | Purpose |
|-------|-----------|------------|---------|
| `factory.command` | API | Orchestrator | Commands: start, stop, reset, assign worker, change output |
| `factory.state` | Orchestrator | API | State snapshots for every factory |
| `factory.<id>.operations` | Orchestrator + containers | Orchestrator + containers | Per-factory event stream |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)

### 1. Clone & build

```bash
git clone <repo-url>
cd distributed-system

# Start all persistent services (API, Orchestrator, Kafka, MongoDB, file-service, report-service)
docker compose up -d --build

# Build ephemeral container images (factory-process, conveyor-process, worker-process)
# These are launched dynamically by the orchestrator — they must be built separately
docker compose --profile build-only build
```

> **Why two build commands?** The ephemeral container images are defined in `docker-compose.yml` under `profiles: [build-only]` so they are never started directly by Compose. They are only built here so the orchestrator can launch them via the Docker API at runtime.

### 2. Seed and sync data

Once all services are healthy, populate MongoDB and register the factories with the orchestrator:

```bash
# Seed MongoDB with sample factories, conveyors, and workers
curl -X POST http://localhost:3300/factories/seed
curl -X POST http://localhost:3300/workers/seed

# Sync MongoDB factories into the orchestrator's in-memory state
curl -X POST http://localhost:3300/factories/sync
```

### 3. Verify

```bash
# Check running services
docker compose ps

# Tail orchestrator logs to see command processing
docker compose logs -f factory-operations-orchestrator

# Get all factories (MongoDB)
curl http://localhost:3300/factories

# Get live orchestrator state for all factories
curl http://localhost:3300/factories/state
```

### Subsequent builds

After code changes:

```bash
docker compose up -d --build
docker compose --profile build-only build  # only needed if factory/conveyor/worker code changed
```

---

## Service Ports

| Service | Port |
|---------|------|
| `factory-operations-api` | `3300` |
| `file-service` | `3100` |
| `report-service` | `3200` |
| Kafka (external / host) | `9092` |
| MongoDB | `27017` |

---

## API Reference

All commands return `202 Accepted` with `{ commandId, type }` — responses are asynchronous.

### Factories

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/factories` | All factories with capacity (from MongoDB) |
| `GET` | `/factories/state` | Live state for all factories (from Kafka cache) |
| `GET` | `/factories/:id/state` | Live state for one factory |
| `GET` | `/factories/:id/conveyors` | Conveyors for a factory |
| `POST` | `/factories/seed` | Seed MongoDB with sample data |
| `POST` | `/factories/sync` | Register all MongoDB factories with the orchestrator |
| `POST` | `/factories/:id/start` | Start a factory |
| `POST` | `/factories/:id/stop` | Stop a factory |
| `POST` | `/factories/:id/reset` | Reset a factory |
| `POST` | `/factories/:id/output/increase` | Increase output level |
| `POST` | `/factories/:id/output/decrease` | Decrease output level |

### Workers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/workers` | All workers |
| `POST` | `/workers/seed` | Seed MongoDB with sample workers |
| `POST` | `/workers/:workerId/assign/:factoryId` | Assign a worker to a factory |

---

## Project Structure

```
distributed-system/
├── docker-compose.yml                  # All service definitions + ephemeral image builds
├── factory-operations-api/             # REST API — user-facing entry point
│   └── src/
│       ├── index.ts                    # App bootstrap (Mongo → Kafka → HTTP)
│       ├── db/connection.ts            # MongoDB connection
│       ├── kafka/
│       │   ├── client.ts               # KafkaJS singleton
│       │   ├── commandTypes.ts         # Shared command type constants
│       │   ├── producer.ts             # publishCommand() → factory.command
│       │   ├── consumer.ts             # Caches factory.state snapshots
│       │   └── sync.ts                 # Syncs MongoDB factories to orchestrator
│       ├── models/                     # Mongoose models: factory, conveyor, worker, part
│       └── routes/
│           ├── factories.ts            # Factory + conveyor endpoints
│           └── workers.ts              # Worker endpoints
│
├── factory-operations-orchestrator/    # Kafka consumer/producer + container manager
│   └── src/
│       ├── index.ts                    # Bootstrap
│       ├── kafka/
│       │   ├── client.ts
│       │   ├── consumer.ts             # Consumes factory.command
│       │   ├── producer.ts             # Publishes to factory.state
│       │   └── operationsPublisher.ts  # Publishes to factory.<id>.operations
│       ├── handlers/index.ts           # One handler per command type
│       ├── state/factoryState.ts       # In-memory factory state store
│       └── docker/manager.ts           # Dockerode — starts/stops containers
│
├── factory-operations/                 # Ephemeral container source code
│   ├── factory/                        # factory-process image
│   ├── conveyor/                       # conveyor-process image
│   └── worker/                         # worker-process image (human + robot)
│
├── file-service/                       # File storage microservice
└── report-service/                     # Report generation (depends on file-service + API)
```

### Where to make changes

| What you want to change | Where |
|-------------------------|-------|
| Add a new REST endpoint | `factory-operations-api/src/routes/` |
| Add a new command type | `factory-operations-api/src/kafka/commandTypes.ts` + handler in `factory-operations-orchestrator/src/handlers/index.ts` |
| Change what data is seeded | `routes/factories.ts` → `seedData()` / `routes/workers.ts` → `seedData()` |
| Change factory/conveyor runtime behaviour | `factory-operations/factory/` or `factory-operations/conveyor/` |
| Change worker runtime behaviour | `factory-operations/worker/` |
| Add a field to a MongoDB model | `factory-operations-api/src/models/` |
| Change how containers are started | `factory-operations-orchestrator/src/docker/manager.ts` |
| Add a new Kafka topic | Define in `docker-compose.yml` env vars (or rely on auto-create), add producer/consumer in the relevant service |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18, TypeScript |
| API framework | Express |
| Messaging | Apache Kafka (Confluent KRaft, no Zookeeper) — KafkaJS client |
| Database | MongoDB 6.0, Mongoose |
| Containerisation | Docker, Docker Compose v2 |
| Docker API client | Dockerode |

