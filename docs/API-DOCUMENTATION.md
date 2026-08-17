# ORBIT Fleet API — Complete Reference

## 1. Overview

The ORBIT Fleet API is a multi-tenant REST and WebSocket backend for fleet administration, live tracking, drivers, routes, geofences, alerts, maintenance, fuel, tasks, cameras, device commands, configurable dropdown values, reporting, users and auditing.

- Local API base URL: `http://localhost:4000/v1`
- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/docs/openapi.json`
- Socket.IO namespace: `http://localhost:4000/fleet`
- Content type: `application/json`
- Dates: ISO 8601 UTC, for example `2026-08-17T11:00:00.000Z`
- Coordinates: WGS84 decimal latitude/longitude
- Speed: kilometers per hour
- Distance/odometer: kilometers
- Fuel: liters

All organization data is isolated using the `organizationId` contained in the authenticated token. Clients cannot supply or override their organization ID.

## 2. Authentication

### Browser clients

`POST /auth/login` sets two HttpOnly cookies:

- `access_token`: 15-minute session token, path `/`.
- `refresh_token`: 30-day refresh token, path `/v1/auth`.

Requests must use `credentials: "include"`. In production both cookies are `Secure` and use `SameSite=Lax`.

### API and mobile clients

Use the returned access token:

```http
Authorization: Bearer <accessToken>
```

Refresh tokens are stored hashed in PostgreSQL. Refreshing rotates and revokes the previous token. Logging out revokes the supplied refresh token.

### Login

`POST /auth/login` — public

```json
{
  "email": "admin@orbit.sa",
  "password": "Orbit@2026"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "user-id",
    "name": "مدير الأسطول",
    "email": "admin@orbit.sa",
    "role": "SUPER_ADMIN",
    "organization": "ORBIT Fleet Demo"
  }
}
```

### Refresh, current user and logout

- `POST /auth/refresh` — public; body `{ "refreshToken": "..." }`, or omit it when the refresh cookie exists.
- `GET /auth/me` — authenticated; returns the active user and organization.
- `POST /auth/logout` — authenticated; accepts an optional refresh token and clears browser cookies.

## 3. Roles and authorization

| Role | Purpose |
|---|---|
| `SUPER_ADMIN` | Full organization control, including deleting users. |
| `ADMIN` | Administrative CRUD, configuration and audit access. |
| `MANAGER` | Fleet, driver, task, maintenance, fuel and geofence management. |
| `DISPATCHER` | Position ingestion, tasks, commands, alerts and camera metadata. |
| `VIEWER` | Read-only access. |

Endpoints without a role note accept any authenticated role. Public endpoints are explicitly identified.

## 4. Common behavior

### Validation

Unknown request fields are rejected. Required fields, email formats, ISO dates, enums and numeric ranges are validated before a controller executes.

Typical validation error:

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

Common status codes:

| Code | Meaning |
|---|---|
| `200` | Successful read/update/delete. |
| `201` | Resource created. |
| `400` | Invalid request, query or enum value. |
| `401` | Missing, invalid or expired authentication. |
| `403` | Authenticated user lacks the required role. |
| `404` | Resource is absent or outside the current organization. |
| `409` | Usually a unique database conflict such as duplicate plate/value. |
| `500` | Unexpected server error. |

### Pagination

Vehicle and driver lists use `page` and `perPage`:

```json
{
  "data": [],
  "meta": { "total": 0, "page": 1, "perPage": 50, "pages": 0 }
}
```

## 5. Health

`GET /health` — public

```json
{ "status": "ok", "service": "orbit-fleet-api", "timestamp": "2026-08-17T11:00:00.000Z" }
```

## 6. Vehicles and telemetry

### Vehicle fields

`name`, `plateNumber`, optional `vin`, `group`, `make`, `model`, `year`, `color`, `driverId`. Runtime fields managed by telemetry include `state`, `speed`, `heading`, `latitude`, `longitude`, `altitude`, `fuelLevel`, `odometer`, `engineHours`, `engineOn` and `lastSeenAt`.

Vehicle states: `MOVING`, `IDLE`, `STOPPED`, `ONLINE`, `OFFLINE`.

| Method and path | Authorization | Description |
|---|---|---|
| `GET /vehicles?search=&page=1&perPage=50` | Authenticated | Search name, plate or group. |
| `GET /vehicles/:id` | Authenticated | Vehicle, driver and five latest maintenance records. |
| `POST /vehicles` | Admin, Super Admin, Manager | Create vehicle. `name` and `plateNumber` required. |
| `PATCH /vehicles/:id` | Admin, Super Admin, Manager | Partial vehicle update. |
| `DELETE /vehicles/:id` | Admin, Super Admin | Delete vehicle and dependent data. |
| `POST /vehicles/:id/positions` | Admin, Super Admin, Dispatcher | Ingest normalized telemetry and broadcast it. |
| `GET /vehicles/:id/history?from=&to=` | Authenticated | Up to 10,000 chronological points. |

Normalized position payload:

```json
{
  "latitude": 24.7136,
  "longitude": 46.6753,
  "speed": 73,
  "heading": 120,
  "altitude": 620,
  "ignition": true,
  "accuracy": 5,
  "recordedAt": "2026-08-17T11:00:00.000Z",
  "raw": { "source": "tcp-adapter" }
}
```

State is computed automatically: speed above 5 → `MOVING`; otherwise ignition on → `IDLE`; otherwise `STOPPED`. The position is persisted, the vehicle snapshot is updated, and `vehicle.position` is emitted.

## 7. Drivers

Driver fields: required `name`, `licenseNumber`; optional `phone`, `email`, `licenseExpiresAt`, `active`.

| Endpoint | Authorization |
|---|---|
| `GET /drivers?page=1&perPage=50` | Authenticated |
| `POST /drivers` | Admin, Super Admin, Manager |
| `PATCH /drivers/:id` | Admin, Super Admin, Manager |
| `DELETE /drivers/:id` | Admin, Super Admin |

`licenseNumber` is unique inside an organization.

## 8. Geofences

| Endpoint | Authorization |
|---|---|
| `GET /geofences` | Authenticated |
| `POST /geofences` | Admin, Super Admin, Manager |
| `PATCH /geofences/:id` | Admin, Super Admin, Manager |
| `DELETE /geofences/:id` | Admin, Super Admin |

Required fields are `name`, `type`, and JSON `geometry`. Circle convention:

```json
{"center":{"latitude":24.7136,"longitude":46.6753},"radiusMeters":1000}
```

Polygon convention:

```json
{"points":[{"latitude":24.7,"longitude":46.6},{"latitude":24.8,"longitude":46.7},{"latitude":24.7,"longitude":46.8}]}
```

## 9. Alerts

Severities: `INFO`, `WARNING`, `CRITICAL`. Statuses: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`.

| Endpoint | Authorization | Notes |
|---|---|---|
| `GET /alerts?status=OPEN` | Authenticated | Latest 500; status filter optional. |
| `POST /alerts` | Admin, Super Admin, Dispatcher | Creates and broadcasts `alert.created`. |
| `PATCH /alerts/:id/status` | Authenticated | Sets acknowledgement/resolution timestamp. |

Create body requires `type`, `title`, `message`; optional `vehicleId`, `severity`, `metadata`.

## 10. Maintenance

Statuses: `UPCOMING`, `DUE`, `OVERDUE`, `COMPLETED`.

Required: `vehicleId`, `name`. Optional: `description`, `status`, `intervalKm`, `intervalHours`, `dueAt`, `dueOdometer`, `cost`.

- `GET /maintenance` — authenticated.
- `POST /maintenance` — Admin, Super Admin, Manager.
- `PATCH /maintenance/:id` — Admin, Super Admin, Manager.
- `DELETE /maintenance/:id` — Admin, Super Admin.

## 11. Fuel

Required: `vehicleId`, positive `liters`, `filledAt`. Optional: `pricePerLiter`, `totalCost`, `odometer`, `station`.

- `GET /fuel` — authenticated.
- `POST /fuel` — Admin, Super Admin, Manager.
- `DELETE /fuel/:id` — Admin, Super Admin.

## 12. Tasks

Statuses: `NEW`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`. Priority is an integer from 1 to 4.

Required: `title`. Optional: `description`, `vehicleId`, `status`, `priority`, `startsAt`, `dueAt`.

- `GET /tasks` — authenticated.
- `POST /tasks` — Admin, Super Admin, Manager, Dispatcher.
- `PATCH /tasks/:id` — Admin, Super Admin, Manager, Dispatcher.
- `DELETE /tasks/:id` — Admin, Super Admin.

## 13. Device commands

Command statuses: `PENDING`, `SENT`, `ACKNOWLEDGED`, `FAILED`, `CANCELLED`.

- `GET /commands?vehicleId=` — authenticated.
- `POST /commands` — Admin, Super Admin, Dispatcher; requires `vehicleId`, `type`; optional JSON `payload`.
- `PATCH /commands/:id/status` — Admin, Super Admin; requires `status`; optional JSON `response`.

Creating a command records a normalized command request. Actual transport to a GPS unit depends on the future TCP protocol adapter and device-specific ACK format.

## 14. Cameras

- `GET /cameras?vehicleId=` — authenticated.
- `POST /cameras` — Admin, Super Admin, Dispatcher.
- `DELETE /cameras/:id` — Admin, Super Admin.

Create fields: required `vehicleId`, `type`, `url`, `capturedAt`; optional `thumbnailUrl`, non-negative `durationSeconds`, JSON `metadata`. This API stores media metadata; binary upload/object-storage integration is external.

## 15. Configuration and dropdown values

Categories currently used by the React interface:

| Category | Used for |
|---|---|
| `vehicle_group` | Vehicle groups |
| `task_priority` | Task priorities |
| `geofence_type` | Circle/polygon choices |
| `alert_type` | Alert/event types |
| `camera_position` | Front/interior/rear positions |
| `maintenance_service` | Service names |
| `report_type` | Report types |
| `report_format` | PDF/Excel/CSV choices |
| `record_status` | Generic UI record statuses |

Configuration fields: `category`, `label`, `value`, optional `active`, `sortOrder`, `metadata`. The tuple `(organizationId, category, value)` is unique.

- `GET /configuration-options?category=&includeInactive=true` — authenticated. Normal dropdowns omit inactive values.
- `POST /configuration-options` — Admin, Super Admin.
- `PATCH /configuration-options/:id` — Admin, Super Admin.
- `DELETE /configuration-options/:id` — Admin, Super Admin.

Vehicle dropdowns are not configuration records; they come from `GET /vehicles` so they always represent actual vehicles.

## 16. Users and audit logs

User roles must use one of the role enum values. Passwords are hashed with bcrypt before storage.

- `GET /users` — Admin, Super Admin.
- `POST /users` — Admin, Super Admin; fields `name`, `email`, `password`, `role`, optional `active`.
- `DELETE /users/:id` — Super Admin only.
- `GET /audit-logs` — Admin, Super Admin; latest 500 operations.

The global audit interceptor asynchronously records successful `POST`, `PATCH`, `PUT`, and `DELETE` calls with user, route, entity ID, IP, user agent and submitted changes.

## 17. Reports

- `GET /reports/dashboard` — aggregate vehicle states, open alerts, due maintenance, active tasks, last-30-day fuel totals and latest alerts.
- `GET /reports/utilization?from=&to=` — moving/idle minutes and utilization percentage per vehicle.
- `GET /reports/vehicles/:id/route?from=&to=` — up to 20,000 route points, point count and maximum speed.

Both `from` and `to` must be ISO 8601 dates.

## 18. Realtime Socket.IO

Connect to namespace `/fleet`. Authentication may be supplied as `auth.token`, an `Authorization: Bearer` handshake header, or the browser `access_token` cookie.

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:4000/fleet", {
  withCredentials: true,
  auth: { token: accessToken }
});
socket.on("vehicle.position", payload => console.log(payload));
socket.on("alert.created", payload => console.log(payload));
```

The socket joins only `org:<organizationId>`, preventing cross-organization broadcasts.

Events:

- `vehicle.position`: updated vehicle snapshot plus string `positionId`.
- `alert.created`: newly persisted alert.

## 19. GPS TCP integration boundary

GPS transport is confirmed to be TCP, but the device-specific listener/parser is intentionally not implemented until the exact protocol is known. The future adapter must:

1. Listen on the approved TCP port.
2. Frame incoming byte streams correctly.
3. Parse device IMEI, timestamp, latitude, longitude, speed, heading, ignition and optional sensors.
4. Resolve the IMEI to a vehicle.
5. Convert the packet to the normalized position body documented above.
6. Persist/update through the fleet domain service.
7. Return the exact ACK expected by the device.
8. Apply connection limits, timeouts, packet-size limits and malformed-packet logging.

Required before implementation: manufacturer/model, protocol name/version, TCP port, raw login packet, raw location packet, heartbeat packet, alarm packet, framing rule and required ACK bytes.

## 20. Postman workflow

1. Import `ORBIT-Fleet-API.postman_collection.json`.
2. Ensure collection variable `baseUrl` is `http://localhost:4000/v1`.
3. Run `Authentication / Login`; its test script saves both tokens.
4. Run `Vehicles / List vehicles` and copy a returned database ID into `vehicleId`.
5. Populate other ID variables after creating or listing their resources.
6. Run mutation requests only against disposable development data.

The collection contains every current controller endpoint, example bodies, query parameters, bearer authorization and reusable resource variables.

## 21. Complete request examples for every API

The examples below cover every request in the Postman collection. Replace variables such as `{{vehicleId}}` with real IDs. Authenticated examples use `{{accessToken}}`.

### Health

#### Health check

Public liveness endpoint.

```bash
curl -i -X GET "{{baseUrl}}/health"
```

Expected success: `200 OK`.

### Authentication

#### Login

Returns access/refresh tokens and sets HttpOnly cookies.

```bash
curl -i -X POST "{{baseUrl}}/auth/login" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"email\": \"admin@orbit.sa\",\n  \"password\": \"Orbit@2026\"\n}"
```

Expected success: `201 Created`.

#### Refresh token

Rotates the refresh token.

```bash
curl -i -X POST "{{baseUrl}}/auth/refresh" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"refreshToken\": \"{{refreshToken}}\"\n}"
```

Expected success: `201 Created`.

#### Current user

Returns the authenticated user and organization.

```bash
curl -i -X GET "{{baseUrl}}/auth/me" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Logout

Revokes the refresh token and clears cookies.

```bash
curl -i -X POST "{{baseUrl}}/auth/logout" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"refreshToken\": \"{{refreshToken}}\"\n}"
```

Expected success: `201 Created`.

### Vehicles

#### List vehicles

Paginated organization vehicles.

```bash
curl -i -X GET "{{baseUrl}}/vehicles?search=&page=1&perPage=50" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Get vehicle

Vehicle details, driver and recent maintenance.

```bash
curl -i -X GET "{{baseUrl}}/vehicles/{{vehicleId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create vehicle

Creates a vehicle.

```bash
curl -i -X POST "{{baseUrl}}/vehicles" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"name\": \"سيارة توزيع 01\",\n  \"plateNumber\": \"ABC 1234\",\n  \"vin\": \"WVWZZZ1JZXW000001\",\n  \"group\": \"أسطول الرياض\",\n  \"make\": \"Toyota\",\n  \"model\": \"Hilux\",\n  \"year\": 2025,\n  \"color\": \"#ffffff\"\n}"
```

Expected success: `201 Created`.

#### Update vehicle

Updates vehicle master data.

```bash
curl -i -X PATCH "{{baseUrl}}/vehicles/{{vehicleId}}" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"name\": \"سيارة توزيع 01 - محدثة\",\n  \"group\": \"أسطول جدة\",\n  \"driverId\": \"{{driverId}}\"\n}"
```

Expected success: `200 OK`.

#### Delete vehicle

Permanently deletes the vehicle and dependent telemetry.

```bash
curl -i -X DELETE "{{baseUrl}}/vehicles/{{vehicleId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Ingest normalized position

Normalized ingestion boundary for a future TCP GPS adapter.

```bash
curl -i -X POST "{{baseUrl}}/vehicles/{{vehicleId}}/positions" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"latitude\": 24.7136,\n  \"longitude\": 46.6753,\n  \"speed\": 73,\n  \"heading\": 120,\n  \"altitude\": 620,\n  \"ignition\": true,\n  \"accuracy\": 5,\n  \"recordedAt\": \"2026-08-17T11:00:00.000Z\",\n  \"raw\": {\n    \"source\": \"tcp-adapter\"\n  }\n}"
```

Expected success: `201 Created`.

#### Vehicle history

Chronological position history.

```bash
curl -i -X GET "{{baseUrl}}/vehicles/{{vehicleId}}/history?from=2026-08-01T00:00:00.000Z&to=2026-08-17T23:59:59.999Z" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Drivers

#### List drivers

Paginated drivers.

```bash
curl -i -X GET "{{baseUrl}}/drivers?page=1&perPage=50" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create driver

Creates a driver.

```bash
curl -i -X POST "{{baseUrl}}/drivers" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"name\": \"خالد محمد\",\n  \"phone\": \"+966500000000\",\n  \"email\": \"driver@example.com\",\n  \"licenseNumber\": \"LIC-1001\",\n  \"licenseExpiresAt\": \"2028-12-31T00:00:00.000Z\",\n  \"active\": true\n}"
```

Expected success: `201 Created`.

#### Update driver

Updates a driver.

```bash
curl -i -X PATCH "{{baseUrl}}/drivers/{{driverId}}" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"name\": \"خالد محمد\",\n  \"phone\": \"+966511111111\",\n  \"licenseNumber\": \"LIC-1001\",\n  \"active\": true\n}"
```

Expected success: `200 OK`.

#### Delete driver

Deletes an organization driver.

```bash
curl -i -X DELETE "{{baseUrl}}/drivers/{{driverId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Geofences

#### List geofences

Lists active and inactive geofences.

```bash
curl -i -X GET "{{baseUrl}}/geofences" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create circle geofence

Creates a circle geofence.

```bash
curl -i -X POST "{{baseUrl}}/geofences" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"name\": \"مستودع الرياض\",\n  \"type\": \"circle\",\n  \"geometry\": {\n    \"center\": {\n      \"latitude\": 24.7136,\n      \"longitude\": 46.6753\n    },\n    \"radiusMeters\": 1000\n  },\n  \"color\": \"#28e1da\",\n  \"active\": true\n}"
```

Expected success: `201 Created`.

#### Update geofence

Updates a geofence.

```bash
curl -i -X PATCH "{{baseUrl}}/geofences/{{geofenceId}}" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"name\": \"مستودع الرياض\",\n  \"type\": \"circle\",\n  \"geometry\": {\n    \"center\": {\n      \"latitude\": 24.7136,\n      \"longitude\": 46.6753\n    },\n    \"radiusMeters\": 1500\n  },\n  \"color\": \"#28e1da\",\n  \"active\": true\n}"
```

Expected success: `200 OK`.

#### Delete geofence

Deletes a geofence.

```bash
curl -i -X DELETE "{{baseUrl}}/geofences/{{geofenceId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Alerts

#### List alerts

Status can be OPEN, ACKNOWLEDGED or RESOLVED.

```bash
curl -i -X GET "{{baseUrl}}/alerts?status=OPEN" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create alert

Creates and broadcasts an alert.

```bash
curl -i -X POST "{{baseUrl}}/alerts" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"vehicleId\": \"{{vehicleId}}\",\n  \"type\": \"OVERSPEED\",\n  \"title\": \"تجاوز السرعة\",\n  \"message\": \"تجاوزت المركبة السرعة المسموحة\",\n  \"severity\": \"WARNING\",\n  \"metadata\": {\n    \"limit\": 120,\n    \"actual\": 132\n  }\n}"
```

Expected success: `201 Created`.

#### Update alert status

Acknowledges or resolves an alert.

```bash
curl -i -X PATCH "{{baseUrl}}/alerts/{{alertId}}/status" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"status\": \"ACKNOWLEDGED\"\n}"
```

Expected success: `200 OK`.

### Maintenance

#### List maintenance

Lists maintenance records with vehicles.

```bash
curl -i -X GET "{{baseUrl}}/maintenance" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create maintenance

Creates a maintenance record.

```bash
curl -i -X POST "{{baseUrl}}/maintenance" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"vehicleId\": \"{{vehicleId}}\",\n  \"name\": \"تغيير الزيت\",\n  \"description\": \"زيت وفلتر\",\n  \"status\": \"UPCOMING\",\n  \"intervalKm\": 10000,\n  \"intervalHours\": 500,\n  \"dueAt\": \"2026-09-01T00:00:00.000Z\",\n  \"dueOdometer\": 50000,\n  \"cost\": 450\n}"
```

Expected success: `201 Created`.

#### Update maintenance

Updates a maintenance record.

```bash
curl -i -X PATCH "{{baseUrl}}/maintenance/{{maintenanceId}}" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"vehicleId\": \"{{vehicleId}}\",\n  \"name\": \"تغيير الزيت\",\n  \"status\": \"COMPLETED\",\n  \"cost\": 475\n}"
```

Expected success: `200 OK`.

#### Delete maintenance

Deletes a maintenance record.

```bash
curl -i -X DELETE "{{baseUrl}}/maintenance/{{maintenanceId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Fuel

#### List fuel records

Lists fuel records.

```bash
curl -i -X GET "{{baseUrl}}/fuel" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create fuel record

Creates a fuel record.

```bash
curl -i -X POST "{{baseUrl}}/fuel" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"vehicleId\": \"{{vehicleId}}\",\n  \"liters\": 42.5,\n  \"pricePerLiter\": 2.33,\n  \"totalCost\": 99.03,\n  \"odometer\": 45220,\n  \"station\": \"محطة الرياض\",\n  \"filledAt\": \"2026-08-17T10:00:00.000Z\"\n}"
```

Expected success: `201 Created`.

#### Delete fuel record

Deletes a fuel record.

```bash
curl -i -X DELETE "{{baseUrl}}/fuel/{{fuelId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Tasks

#### List tasks

Lists organization tasks.

```bash
curl -i -X GET "{{baseUrl}}/tasks" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create task

Creates a task.

```bash
curl -i -X POST "{{baseUrl}}/tasks" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"vehicleId\": \"{{vehicleId}}\",\n  \"title\": \"توصيل شحنة\",\n  \"description\": \"من المستودع إلى الفرع\",\n  \"status\": \"NEW\",\n  \"priority\": 2,\n  \"startsAt\": \"2026-08-18T08:00:00.000Z\",\n  \"dueAt\": \"2026-08-18T12:00:00.000Z\"\n}"
```

Expected success: `201 Created`.

#### Update task

Updates a task.

```bash
curl -i -X PATCH "{{baseUrl}}/tasks/{{taskId}}" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"title\": \"توصيل شحنة\",\n  \"status\": \"IN_PROGRESS\",\n  \"priority\": 2\n}"
```

Expected success: `200 OK`.

#### Delete task

Deletes a task.

```bash
curl -i -X DELETE "{{baseUrl}}/tasks/{{taskId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Device Commands

#### List commands

Lists device commands.

```bash
curl -i -X GET "{{baseUrl}}/commands?vehicleId={{vehicleId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create command

Queues a normalized device command. TCP delivery adapter is not implemented yet.

```bash
curl -i -X POST "{{baseUrl}}/commands" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"vehicleId\": \"{{vehicleId}}\",\n  \"type\": \"REQUEST_POSITION\",\n  \"payload\": {\n    \"reason\": \"manual_refresh\"\n  }\n}"
```

Expected success: `201 Created`.

#### Update command status

Adapter/internal acknowledgement endpoint.

```bash
curl -i -X PATCH "{{baseUrl}}/commands/{{commandId}}/status" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"status\": \"ACKNOWLEDGED\",\n  \"response\": {\n    \"message\": \"OK\"\n  }\n}"
```

Expected success: `200 OK`.

### Cameras

#### List camera media

Lists camera media metadata.

```bash
curl -i -X GET "{{baseUrl}}/cameras?vehicleId={{vehicleId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create camera media

Stores camera media metadata.

```bash
curl -i -X POST "{{baseUrl}}/cameras" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"vehicleId\": \"{{vehicleId}}\",\n  \"type\": \"front_snapshot\",\n  \"url\": \"https://cdn.example.com/media/image.jpg\",\n  \"thumbnailUrl\": \"https://cdn.example.com/media/thumb.jpg\",\n  \"capturedAt\": \"2026-08-17T10:00:00.000Z\",\n  \"metadata\": {\n    \"cameraPosition\": \"front\"\n  }\n}"
```

Expected success: `201 Created`.

#### Delete camera media

Deletes camera media metadata.

```bash
curl -i -X DELETE "{{baseUrl}}/cameras/{{cameraId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Configuration

#### List active configuration

Values used by frontend dropdowns.

```bash
curl -i -X GET "{{baseUrl}}/configuration-options" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### List all configuration

Includes disabled values for the configuration page.

```bash
curl -i -X GET "{{baseUrl}}/configuration-options?includeInactive=true" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create configuration option

Creates a dropdown option.

```bash
curl -i -X POST "{{baseUrl}}/configuration-options" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"category\": \"vehicle_group\",\n  \"label\": \"أسطول الدمام\",\n  \"value\": \"dammam_fleet\",\n  \"active\": true,\n  \"sortOrder\": 10\n}"
```

Expected success: `201 Created`.

#### Update configuration option

Updates or disables an option.

```bash
curl -i -X PATCH "{{baseUrl}}/configuration-options/{{configurationId}}" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"category\": \"vehicle_group\",\n  \"label\": \"أسطول الدمام المحدث\",\n  \"value\": \"dammam_fleet\",\n  \"active\": true,\n  \"sortOrder\": 10\n}"
```

Expected success: `200 OK`.

#### Delete configuration option

Deletes a dropdown option.

```bash
curl -i -X DELETE "{{baseUrl}}/configuration-options/{{configurationId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Users and Audit

#### List users

Admin-only organization users.

```bash
curl -i -X GET "{{baseUrl}}/users" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Create user

Creates an organization user.

```bash
curl -i -X POST "{{baseUrl}}/users" \
  -H "Authorization: Bearer {{accessToken}}" \
  -H "Content-Type: application/json" \
  --data-binary "{\n  \"name\": \"مشرف العمليات\",\n  \"email\": \"ops@example.com\",\n  \"password\": \"StrongPassword123!\",\n  \"role\": \"DISPATCHER\",\n  \"active\": true\n}"
```

Expected success: `201 Created`.

#### Delete user

SUPER_ADMIN only.

```bash
curl -i -X DELETE "{{baseUrl}}/users/{{userId}}" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Audit logs

Latest 500 mutating actions.

```bash
curl -i -X GET "{{baseUrl}}/audit-logs" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

### Reports

#### Dashboard report

Fleet counts, alerts, maintenance, tasks and fuel summary.

```bash
curl -i -X GET "{{baseUrl}}/reports/dashboard" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Utilization report

Moving/idle minutes and utilization per vehicle.

```bash
curl -i -X GET "{{baseUrl}}/reports/utilization?from=2026-08-01T00:00:00.000Z&to=2026-08-17T23:59:59.999Z" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

#### Vehicle route report

Vehicle and route points with summary.

```bash
curl -i -X GET "{{baseUrl}}/reports/vehicles/{{vehicleId}}/route?from=2026-08-01T00:00:00.000Z&to=2026-08-17T23:59:59.999Z" \
  -H "Authorization: Bearer {{accessToken}}"
```

Expected success: `200 OK`.

