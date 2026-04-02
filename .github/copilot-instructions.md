# Factory Operations — Distributed System

## Architecture Overview

This is an event-driven distributed system built around **Apache Kafka** as the central message bus. User-facing requests enter through the REST API, which communicates with the rest of the system via Kafka topics.

```
User → factory-operations-api → Kafka → factory-operations-orchestrator
                                              ↓ creates
                                   factory | conveyor | human-worker | robot-worker
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `factory-operations-api` | 3300 | REST API; user-facing entry point, reads state, issues commands |
| `factory-operations-orchestrator` | — | Kafka consumer/producer; creates and coordinates factory instances |
| `factory` | — | Individual factory process; managed by orchestrator |
| `conveyor` | — | Conveyor belt process; managed by orchestrator |
| `human-worker` | — | Human worker process; managed by orchestrator |
| `robot-worker` | — | Robot worker process; managed by orchestrator |
| `file-service` | 3100 | File storage service |
| `report-service` | 3200 | Report generation; depends on file-service and factory-operations-api |

## Kafka Topics

### `factory.command`
- **Publisher**: `factory-operations-api`
- **Subscriber**: `factory-operations-orchestrator`
- **Purpose**: Carries commands from the API layer to the orchestrator (e.g., start factory, stop conveyor, assign worker, reset factory, increase output, decrease output).

### `factory.state`
- **Publisher**: `factory-operations-orchestrator`
- **Subscriber**: `factory-operations-api`
- **Purpose**: Broadcasts current state snapshots back to the API so it can serve read requests without querying each instance directly.

### `factory.<factory-instance>.operations`
- **Publisher/Subscriber**: `factory-operations-orchestrator`, `factory`, `conveyor`, `human-worker`, `robot-worker`
- **Purpose**: Per-factory event stream. Each factory instance has its own topic. The orchestrator relays commands down; all components publish operational events back up.
- **Naming convention**: Replace `<factory-instance>` with the factory's unique identifier (e.g., `factory.f1.operations`).

## Communication Patterns

- `factory-operations-api` is **stateless at the process layer** — it reads state from the `factory.state` topic (or MongoDB) and issues commands via `factory.command`. It never talks to orchestrator or factory instances directly.
- `factory-operations-orchestrator` is the **single point of orchestration**: it spins up/down factory, conveyor, and worker containers and coordinates them via per-factory topics.
- `factory`, `conveyor`, `human-worker`, and `robot-worker` are **ephemeral processes** created by the orchestrator. They subscribe/publish only to their factory-scoped topic (`factory.<factory-instance>.operations`).

## Technology Stack

- **API / Services**: Node.js, TypeScript, Express
- **Database**: MongoDB 6.0 (used by `factory-operations-api`)
- **Messaging**: Apache Kafka
- **Containerization**: Docker, Docker Compose
- **Network**: All services on `app-network` bridge network

## Project Layout

```
factory-operations/          # Dockerfiles for orchestrated process containers
  conveyor/Dockerfile
  factory/Dockerfile
  worker/Dockerfile           # Used for both human-worker and robot-worker
factory-operations-api/      # REST API (Express + TypeScript + MongoDB)
  src/
    db/connection.ts
    models/                  # Mongoose models: factory, conveyor, worker, part
    routes/                  # factories.ts, workers.ts
file-service/                # File storage microservice
report-service/              # Report generation microservice
docker-compose.yml           # Orchestrates all statically defined services, not ephemeral factory/conveyor/worker containers
```

## Data Models

- **Factory**: `name`, `status` (active | maintenance), `location`, `conveyors[]`
- **Conveyor**: `name`, `status` (active | inactive | maintenance), `capacity`
- **Worker**: `name`, `location`, `type` (human | robot), `shift` (for humans) | `firmwareVersion` (for robots)

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/factories` | List all factories with effective/total capacity |
| GET | `/factories/:id/conveyors` | List conveyors for a factory |
| POST | `/factories/seed` | Seed factory and conveyor data |
| GET | `/workers` | List all workers |
| POST | `/workers/seed` | Seed worker data |

## Implementation Status

- [x] `factory-operations-api` — REST API with MongoDB persistence
- [x] `file-service` — File storage
- [x] `report-service` — Report generation
- [ ] `factory-operations-orchestrator` — **Not yet implemented**; Kafka consumer/producer that creates factory/conveyor/worker containers
- [ ] Kafka integration — Topics and producers/consumers not yet wired up
- [ ] Per-factory process containers (`factory`, `conveyor`, `human-worker`, `robot-worker`) — Dockerfiles exist but runtime logic not implemented

## Conventions

- Services are TypeScript with `tsconfig.json` and compiled via `tsc`.
- Environment variables are used for all external URLs and credentials (never hardcoded).
- Each service has its own `Dockerfile` and is independently deployable.
- MongoDB collections use Mongoose models; factory-level aggregations are preferred over application-level joins.
- Kafka topic names follow the pattern `factory.<scope>.<event-type>`.
