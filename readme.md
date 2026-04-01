# Purpose
This project is meant to be a learning experience for docker & kafka. This uses docker to distribute the system across multiple microservices and kafka for some of the event-driven components of the system.

# Getting Started
- The docker-compose.yml file establishes the system from its separate components, each with dedicated Dockerfiles
- Run <code>docker compose up -d</code> for a simple and quick run, building should occurr automatically since each Dockerfile is defined this way. For subsequent changed, run <code>docker compose up --build -d</code>

## Local Development
- This project employs separate folders for certain logic or reused components
    - When updating data-access (source project) follow this process
        - remove <code>node_modules</code> from target project
        - remove <code>package-lock.json</code> from target project
        - run <code>npm run build</code> on source project
        - run <code>npm pack</code> on source project
        - run <code>npm i</code> on target project
        - NOTE: the <code>dist/</code> folder may need to be removed from the source project to see updates.

# Technical Specifications
- The base project requires MongoDb & Kafka images, the rest of the images were created from scratch to fulfill each components primary objective. For more functionality, more components may be added to the system.

- This system was built on NodeJs for it's back-end operations. To integrate with Kafka, Kafkajs was used. This was chosen over Java (the natively supported language of Kafka) mostly for convenience and fast build out. This is a trade-off.

