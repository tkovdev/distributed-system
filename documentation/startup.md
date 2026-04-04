# Startup Process

This document describes the full startup sequence for the Factory Operations distributed system — what starts, in what order, and why.

---

## 1. Docker Compose brings up infrastructure and services

Running `docker compose up -d --build` starts all statically-defined services. Compose respects `depends_on` conditions, so the sequence is:

```
kafka → mongodb → factory-operations-api
                → factory-operations-orchestrator
```

### Kafka

Starts first with no dependencies. The other services have `condition: service_healthy` on Kafka, so they wait until Kafka's healthcheck passes (i.e. it can list topics via `kafka-topics --bootstrap-server localhost:9092 --list`). This takes up to ~30 seconds on first boot.

### MongoDB

Starts in parallel with Kafka. The `factory-operations-api` uses `condition: service_healthy` to wait for MongoDB healthcheck pass. After this passes the API starts.

### factory-operations-api (port 3300)

Once Kafka & Mongodb are healthy, the API bootstraps in this order:

1. **Connect to MongoDB** — establishes the Mongoose connection
2. **Initialize Kafka topics** — creates `factory.command` and `factory.state` if they don't already exist (uses the Kafka admin client, then disconnects it)
3. **Connect Kafka producer** — used to publish commands to `factory.command`
4. **Start Kafka state consumer** — subscribes to `factory.state` and caches snapshots in memory; GET endpoints (`/factories/state`) read from this cache
5. **Sync factories to orchestrator** — queries MongoDB for all factories and publishes a `REGISTER_FACTORY` command for each, so the orchestrator's in-memory state is populated; this step is non-fatal if the DB is empty
6. **Start HTTP server** on the configured port

### factory-operations-orchestrator

Also starts once Kafka is healthy, bootstrapping in this order:

1. **Initialize Kafka topics** — same topic creation step as the API (safe to run twice; topics already exist)
2. **Connect Kafka producer** — used to publish to `factory.state`
3. **Connect operations producer** — used to publish to per-factory `factory.<id>.operations` topics
4. **Start command consumer** — subscribes to `factory.command` and begins dispatching incoming commands to handlers

---

## 2. Build ephemeral container images

```bash
docker compose --profile build-only build
```

This builds the three ephemeral process images (`factory-process`, `conveyor-process`, `worker-process`) without starting them. They are defined under `profiles: [build-only]` so Compose never runs them directly — they exist only as pre-built images for the orchestrator to launch at runtime via the Docker API.

> This step only needs to be re-run if the source code in `factory-operations/factory/`, `factory-operations/conveyor/`, or `factory-operations/worker/` changes.

---

## 3. Seed and sync data

Once all services are up:

```bash
curl -X POST http://localhost:3300/factories/seed   # inserts sample factories + conveyors into MongoDB
curl -X POST http://localhost:3300/workers/seed     # inserts sample workers into MongoDB
curl -X POST http://localhost:3300/factories/sync   # publishes REGISTER_FACTORY for each factory to Kafka
```

The `/factories/sync` call triggers the orchestrator to populate its in-memory state store with all known factories. This is the same sync that runs automatically on API startup, but it can be called manually at any time to re-sync.

---

## 4. Ephemeral containers (factory, conveyor, worker)

These are **not** started by Docker Compose. They are launched by the orchestrator at runtime in response to commands:

- `POST /factories/:id/start` → API publishes `START_FACTORY` to `factory.command` → orchestrator handles it → calls `startFactoryContainers()` via Dockerode → Docker starts a `factory-process` container and one `conveyor-process` container per conveyor
- `POST /workers/:workerId/assign/:factoryId` → API publishes `ASSIGN_WORKER` → orchestrator starts a `worker-process` container

Each ephemeral container:
1. Connects to Kafka
2. Subscribes to its factory-scoped topic: `factory.<factoryId>.operations`
3. Publishes an activation event (`FACTORY_READY`, `CONVEYOR_ACTIVE`) back to that topic
4. Waits for further operational events

---

## Shutdown sequence

`docker compose down` stops services in reverse dependency order:

1. `factory-operations-api` and `factory-operations-orchestrator` are stopped first (they depend on Kafka)
2. The **orchestrator's SIGTERM handler** fires and calls `docker.stop()` on every tracked factory, conveyor, and worker container before exiting — Kafka is still up at this point, so the ephemeral containers can disconnect cleanly
3. Kafka is stopped last
4. MongoDB is stopped

> The orchestrator has `stop_grace_period: 60s` to ensure it has enough time to stop all ephemeral containers before Docker force-kills it.
