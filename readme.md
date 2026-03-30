# Purpose
This project is meant to be a learning experience for docker & kafka. This uses docker to distribute the system across multiple microservices and kafka for some of the event-driven components of the system.

# Getting Started
- The docker-compose.yml file establishes the system from its separate components, each with dedicated Dockerfiles
- Run <code>docker compose up -d</code> for a simple and quick run, building should occurr automatically since each Dockerfile is defined this way. For subsequent changed, run <code>docker compose up --build -d</code>

# Technical Specifications
- The base project requires MongoDb & Kafka images, the rest of the images were created from scratch to fulfill each components primary objective. For more functionality, more components may be added to the system.

- This system was built on NodeJs for it's back-end operations. To integrate with Kafka, Kafkajs was used. This was chosen over Java (the natively supported language of Kafka) mostly for convenience and fast build out. This is a trade-off.