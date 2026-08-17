# ORBIT Fleet Backend

Production-oriented NestJS backend for the ORBIT fleet dashboard.

## Included

- PostgreSQL schema with organizations, users, vehicles, drivers, positions, geofences, alerts, maintenance, fuel, tasks, device commands, camera media and audit logs.
- Access and refresh JWT rotation with hashed refresh tokens. Browser sessions use secure HttpOnly cookies; API clients can use Bearer tokens.
- Role-based authorization: `SUPER_ADMIN`, `ADMIN`, `DISPATCHER`, `MANAGER`, `VIEWER`.
- REST CRUD APIs under `/v1`.
- Real-time Socket.IO namespace `/fleet` with `vehicle.position` and `alert.created` events.
- Dashboard, utilization and route-history reports.
- Swagger UI at `/docs` and OpenAPI JSON at `/docs/openapi.json`.
- Validation, Helmet, CORS, compression, audit logging and health checks.
- Docker Compose for PostgreSQL, Redis and the API.

## Local setup

1. Copy `.env.example` to `.env` and change both JWT secrets.
2. From the repository root run `docker compose up -d postgres redis`.
3. In `backend`, run `npm run prisma:generate`, `npm run prisma:deploy`, `npm run prisma:seed`, then `npm run start:dev`.
4. Sign in using `admin@orbit.sa` / `Orbit@2026` only in local seeded development.

The complete interactive API reference is available at `http://localhost:4000/docs` after startup. Configure the frontend with `NEXT_PUBLIC_API_URL=http://localhost:4000/v1` and `NEXT_PUBLIC_USE_MOCK_API=false`.

## API review files

- `docs/API-DOCUMENTATION.md`: complete human-readable reference, roles, payloads, errors, realtime events and TCP boundary.
- `docs/ORBIT-Fleet-API.postman_collection.json`: Postman Collection v2.1 with all endpoints and examples.
- `docs/openapi.json`: generated OpenAPI document for Swagger, Insomnia and API client generators.

## GPS adapter boundary

The backend accepts normalized positions at `POST /v1/vehicles/:id/positions`. A later adapter can translate HTTP, MQTT, TCP or vendor-specific messages into that DTO without changing the domain, database, WebSocket, alert or frontend layers.
