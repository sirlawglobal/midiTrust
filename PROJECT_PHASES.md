# MediTrust Enterprise Healthcare & Fintech Payment Verification Platform
## Master Architecture & Phase-by-Phase Implementation Plan

---

## 1. Executive Summary & Architectural Vision

**MediTrust** is an enterprise-grade healthcare billing and payment verification platform engineered to eradicate hospital revenue leakage, eliminate payment fraud, and streamline inpatient/outpatient medication release workflows. 

### Architectural Pattern: Modular Monolith with Domain-Driven Design (DDD)
The backend is built as a **Modular Monolith** running inside Node.js using **NestJS (TypeScript)**. 
- **No Microservices & No RabbitMQ**: Bounded contexts (Modules) reside inside a single highly cohesive, loosely coupled deployment unit.
- **Internal Event-Driven Communication**: Modules strictly communicate asynchronously via `EventEmitter2` (`@nestjs/event-emitter`) for cross-domain workflows (e.g., when a payment is verified, the Payment Module emits `PaymentCompleted`, triggering background PDF generation, socket updates, and audit logs without direct coupling).
- **Clean Architecture & SOLID Principles**: Every module enforces strict layer boundaries:
  - **Controllers**: Strictly route HTTP requests, apply Guards/Interceptors, validate DTOs, and delegate to Services. Zero business logic.
  - **Services**: Contain pure business logic and orchestrate domain workflows.
  - **Repositories**: Encapsulate Mongoose queries, aggregations, and database interactions through clean interfaces.
  - **Schemas & Interfaces**: Define pure domain entities and persistence contracts.

---

## 2. Comprehensive Folder Structure & Module Layout

```text
C:\Users\HomePC\Desktop\MASTERS\Balposi\midTrust\
├── src/
│   ├── main.ts                          # App Bootstrap (Swagger, Global Pipes, Filters, Security)
│   ├── app.module.ts                    # Root Module linking all Infrastructure & Domain modules
│   │
│   ├── common/                          # Global Shared Kernels & Clean Architecture Artifacts
│   │   ├── constants/                   # Injection Tokens, Error Codes, Regex, Header Keys
│   │   ├── decorators/                  # @CurrentUser(), @Roles(), @Permissions(), @Public()
│   │   ├── dto/                         # PaginationDto, ApiResponseDto, ErrorResponseDto
│   │   ├── enums/                       # RoleEnum, PermissionEnum, InvoiceStatus, PaymentStatus
│   │   ├── filters/                     # GlobalHttpExceptionFilter, MongoExceptionFilter
│   │   ├── guards/                      # JwtAuthGuard, RolesGuard, PermissionsGuard, ThrottlerGuard
│   │   ├── interceptors/                # LoggingInterceptor, TransformResponseInterceptor, TimeoutInterceptor
│   │   ├── interfaces/                  # IBaseRepository, IJwtPayload, IActiveUser
│   │   ├── pipes/                       # MongoIdValidationPipe, SanitizeInputPipe
│   │   └── utils/                       # HmacValidator, QrGenerator, CryptoUtils, PaginationBuilder
│   │
│   ├── config/                          # Type-Safe Environment & App Configuration
│   │   ├── app.config.ts                # Port, Env, API Prefix, Version
│   │   ├── database.config.ts           # Mongo URI, Pool Size, Replica Set settings
│   │   ├── redis.config.ts              # Redis Host, Port, Password, TTLs
│   │   ├── jwt.config.ts                # Secret, Refresh Secret, Expiration times
│   │   ├── monnify.config.ts            # API Key, Secret Key, Base URL, Contract Code
│   │   ├── r2.config.ts                 # Cloudflare R2 Account ID, Access Key, Secret Key, Bucket
│   │   └── messaging.config.ts          # WhatsApp Cloud API, Termii / Twilio credentials
│   │
│   ├── infrastructure/                  # Core Cross-Cutting Technical Infrastructure
│   │   ├── database/                    # MongooseModule setup, Abstract Base Repository implementation
│   │   ├── redis/                       # Redis Client setup, Distributed Lock Service
│   │   ├── queue/                       # BullMQ Root Configuration & Queue Names
│   │   ├── storage/                     # Cloudflare R2 (S3 Client) Storage Service
│   │   ├── logger/                      # Pino / Winston Structured JSON Logging Service
│   │   └── mailer/                      # Email Sending Infrastructure (Nodemailer / SMTP)
│   │
│   └── modules/                         # Bounded Domain Contexts (Modules)
│       ├── auth/                        # Authentication & Session Management
│       ├── users/                       # Staff & Role-Based Access Control (RBAC)
│       ├── patients/                    # Patient Registry & Medical Billing Profiles
│       ├── billing/                     # Invoices, Invoice Items & Virtual Accounts
│       ├── payments/                    # Monnify Webhooks, HMAC Validation & Payment State
│       ├── receipts/                    # Signed JWT Receipts, PDF Generation & R2 Uploads
│       ├── notifications/               # Multi-Channel Dispatch (SMS, WhatsApp, Email)
│       ├── verification/                # Cryptographic QR & Signed Receipt Verification
│       ├── dashboard/                   # Revenue & Transaction Analytics (Aggregations)
│       ├── audit/                       # Immutable Critical Action Audit Logging
│       ├── settings/                    # System & Hospital Operational Configuration
│       └── health/                      # Readiness & Liveness Probes (@nestjs/terminus)
```

---

## 3. Database Collections, MongoDB Schemas & Optimized Index Strategy

### 3.1. Collection: `users`, `roles`, `permissions`, `sessions`
```typescript
// roles schema
{
  name: String (Unique, Indexed), // e.g. "ADMIN", "STAFF"
  description: String,
  permissions: [String], // Array of PermissionEnum strings
  isSystemRole: Boolean (Default: false),
  createdAt: Date, updatedAt: Date
}

// users schema
{
  email: String (Unique, Indexed, Lowercase, Trimmed),
  passwordHash: String (Select: false),
  firstName: String, lastName: String,
  phone: String (Indexed),
  roleId: ObjectId (Ref: 'Role', Indexed),
  department: String,
  isActive: Boolean (Default: true, Indexed),
  lastLoginAt: Date,
  createdAt: Date, updatedAt: Date
}
// Indexes: { email: 1 }, { roleId: 1, isActive: 1 }, { phone: 1 }

// sessions schema
{
  userId: ObjectId (Ref: 'User', Indexed),
  refreshTokenHash: String (Indexed),
  ipAddress: String, userAgent: String,
  isValid: Boolean (Default: true, Indexed),
  expiresAt: Date (Indexed, TTL Index: expireAfterSeconds 0)
}
// Indexes: { userId: 1, isValid: 1 }, { refreshTokenHash: 1 }, { expiresAt: 1 } (TTL)
```

### 3.2. Collection: `patients`
```typescript
{
  patientNumber: String (Unique, Indexed), // e.g., "PAT-2026-000192"
  firstName: String, lastName: String,
  email: String (Indexed),
  phoneNumber: String (Indexed),
  dateOfBirth: Date,
  gender: String (Enum: ['MALE', 'FEMALE', 'OTHER']),
  address: { street: String, city: String, state: String },
  emergencyContact: { name: String, phone: String, relationship: String },
  metadata: Record<string, any>,
  createdAt: Date, updatedAt: Date
}
// Indexes: { patientNumber: 1 }, { phoneNumber: 1 }, { email: 1 }, { lastName: 1, firstName: 1 }
```

### 3.3. Collection: `invoices`, `invoice_items`, `virtual_accounts`
```typescript
// invoice_items schema (Embedded or Referenced)
{
  invoiceId: ObjectId (Ref: 'Invoice', Indexed),
  serviceCode: String, // e.g. "LAB-001", "PHARM-502"
  description: String,
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
  department: String // e.g. "PHARMACY", "RADIOLOGY", "CONSULTATION"
}

// virtual_accounts schema
{
  invoiceId: ObjectId (Ref: 'Invoice', Unique, Indexed),
  accountReference: String (Unique, Indexed), // Monnify unique reference
  accountNumber: String (Indexed), // 10-digit NUBAN
  accountName: String,
  bankName: String, bankCode: String,
  reservationReference: String,
  expiresAt: Date (Indexed),
  isActive: Boolean (Default: true),
  createdAt: Date, updatedAt: Date
}

// invoices schema
{
  invoiceNumber: String (Unique, Indexed), // e.g., "INV-2026-08912"
  patientId: ObjectId (Ref: 'Patient', Indexed),
  createdById: ObjectId (Ref: 'User', Indexed),
  totalAmount: Number,
  amountPaid: Number (Default: 0),
  status: String (Enum: ['DRAFT', 'PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED'], Indexed),
  virtualAccountId: ObjectId (Ref: 'VirtualAccount'),
  items: [InvoiceItemSchema],
  paidAt: Date,
  expiresAt: Date (Indexed),
  notes: String,
  createdAt: Date, updatedAt: Date
}
// Indexes: { invoiceNumber: 1 }, { patientId: 1, status: 1 }, { status: 1, createdAt: -1 }, { createdById: 1 }
```

### 3.4. Collection: `payments`
```typescript
{
  paymentReference: String (Unique, Indexed), // Monnify transaction reference
  invoiceId: ObjectId (Ref: 'Invoice', Indexed),
  patientId: ObjectId (Ref: 'Patient', Indexed),
  accountReference: String (Indexed),
  amountPaid: Number,
  fee: Number,
  netAmount: Number,
  currency: String (Default: "NGN"),
  paymentMethod: String (Enum: ['ACCOUNT_TRANSFER', 'CARD', 'USSD']),
  status: String (Enum: ['PENDING', 'PAID', 'OVERPAID', 'PARTIAL', 'FAILED'], Indexed),
  paidOn: Date (Indexed),
  payerBankName: String, payerAccountNumber: String, payerAccountName: String,
  rawWebhookPayload: Object, // Complete auditable Monnify JSON snapshot
  processedAt: Date,
  createdAt: Date, updatedAt: Date
}
// Indexes: { paymentReference: 1 } (Unique), { invoiceId: 1 }, { paidOn: -1 }, { status: 1 }
```

### 3.5. Collection: `receipts`
```typescript
{
  receiptNumber: String (Unique, Indexed), // e.g., "RCP-2026-99182"
  invoiceId: ObjectId (Ref: 'Invoice', Unique, Indexed),
  paymentId: ObjectId (Ref: 'Payment', Unique, Indexed),
  patientId: ObjectId (Ref: 'Patient', Indexed),
  qrCodeDataUrl: String, // Base64 or verification URL encoded inside QR
  signedJwtToken: String (Indexed), // High-security cryptographic verification token
  pdfR2Key: String, // Cloudflare R2 Object Key
  pdfUrl: String, // Public / Signed download URL
  issuedAt: Date (Indexed),
  isVerified: Boolean (Default: false),
  verificationCount: Number (Default: 0),
  lastVerifiedAt: Date,
  createdAt: Date, updatedAt: Date
}
// Indexes: { receiptNumber: 1 }, { invoiceId: 1 }, { paymentId: 1 }, { signedJwtToken: 1 }
```

### 3.6. Collection: `notifications`
```typescript
{
  recipient: String (Indexed), // Phone number or email
  channel: String (Enum: ['SMS', 'WHATSAPP', 'EMAIL'], Indexed),
  templateName: String, // e.g., "PAYMENT_RECEIPT_WHATSAPP"
  contextData: Object, // Variables passed to template
  status: String (Enum: ['PENDING', 'SENT', 'FAILED', 'RETRYING'], Indexed),
  providerResponse: Object,
  errorMessage: String,
  retryCount: Number (Default: 0),
  nextRetryAt: Date (Indexed),
  relatedEntityId: ObjectId, // e.g. Receipt ID or Invoice ID
  relatedEntityType: String,
  createdAt: Date, updatedAt: Date
}
// Indexes: { status: 1, nextRetryAt: 1 }, { recipient: 1 }, { relatedEntityId: 1 }
```

### 3.7. Collection: `audit_logs`
```typescript
{
  action: String (Indexed), // e.g., "INVOICE_CREATED", "WEBHOOK_RECEIVED", "STAFF_DEACTIVATED"
  userId: ObjectId (Ref: 'User', Indexed, Nullable for webhooks/system),
  userEmail: String,
  resourceId: String (Indexed),
  resourceType: String (Indexed), // e.g., "Invoice", "Payment", "Patient"
  ipAddress: String,
  userAgent: String,
  oldState: Object,
  newState: Object,
  status: String (Enum: ['SUCCESS', 'FAILURE']),
  metadata: Record<string, any>,
  timestamp: Date (Indexed)
}
// Indexes: { action: 1, timestamp: -1 }, { resourceId: 1, resourceType: 1 }, { userId: 1, timestamp: -1 }
```

---

## 4. Core Security & Authentication Architecture

1. **Dual-Token Authentication (JWT + Refresh Token)**:
   - Access Token: Short-lived (15 minutes), signed with RS256 / HS256 containing `userId`, `email`, `role`, and `permissions`.
   - Refresh Token: Long-lived (7 days), cryptographically hashed (`bcrypt` or `SHA256`) before storing in the `sessions` collection. Revocation is instantaneous by toggling `isValid = false` or deleting the session document.
2. **Role-Based Access Control (RBAC) & Fine-Grained Permissions**:
   - Custom `@Roles(...)` and `@Permissions(...)` metadata decorators checked by strict `RolesGuard` and `PermissionsGuard` applied globally or per-controller.
3. **Monnify Webhook HMAC-SHA512 Signature Validation**:
   - Webhook requests from Monnify are intercepted by a raw body buffer middleware and verified against `monnifySecretKey` using `crypto.createHmac('sha512', secret).update(rawBody).digest('hex')`. Any mismatch throws an immediate `401 Unauthorized` without querying the database.
4. **Idempotent Payment & Webhook Protection**:
   - To prevent duplicate credit processing from retried webhooks, the `Payment` creation wraps inside a MongoDB multi-document ACID transaction (`ClientSession`) or utilizes atomic `findOneAndUpdate({ paymentReference: ref }, { $setOnInsert: newPayment }, { upsert: true })`.
5. **Defense-in-Depth Layering**:
   - **Rate Limiting**: `@nestjs/throttler` backed by Redis (`ThrottlerStorageRedisService`) preventing brute-force login and SMS spam.
   - **Mongo Injection & XSS Sanitization**: Global `SanitizeInputPipe` stripping `$where` and MongoDB operator keys (`$`) from query/body parameters.
   - **Global Security Headers**: `Helmet` configuration disabling sensitive headers and enforcing HSTS/CSP.

---

## 5. Event-Driven & Queue Architecture (Internal Monolith + BullMQ)

### 5.1. Internal Domain Events (`@nestjs/event-emitter`)
When domain state transitions occur, services emit synchronous or asynchronous local events without importing external module services:
- `InvoiceCreated`: Triggered when an invoice is finalized. Emits `invoice.created` to Socket.IO and schedules virtual account monitoring.
- `PaymentReceived`: Emitted upon successful Monnify webhook validation.
- `PaymentCompleted`: Emitted when the invoice status atomic transition to `PAID` is confirmed. Triggers:
  1. Receipt Module: Generates QR Code + Signed JWT + PDF -> Uploads to R2 -> Emits `ReceiptGenerated`.
  2. Socket.IO Gateway: Broadcasts `payment.completed` and `dashboard.updated` to pharmacy/receptionist rooms.
  3. Audit Module: Logs immutable record.
- `ReceiptGenerated`: Triggers BullMQ Notification jobs (WhatsApp + SMS).

### 5.2. Background Jobs & Redis Queues (BullMQ)
- **`receipt-generation-queue`**: Handles high-CPU PDF generation via `PDFKit` / `Puppeteer` and streaming upload to Cloudflare R2 (`@aws-sdk/client-s3`).
- **`notification-dispatch-queue`**: Handles WhatsApp Cloud API and Termii SMS dispatch with exponential backoff (`attempts: 5, backoff: { type: 'exponential', delay: 5000 }`).
- **`virtual-account-expiry-queue`**: Cron/scheduled job running every 15 minutes to mark unpaid virtual accounts older than 24 hours as `EXPIRED`.
- **`audit-log-queue`**: Asynchronous batching of non-blocking audit entries to ensure API latency remains under 50ms.

---

## 6. Realtime Gateway Architecture (`Socket.IO`)

- **Namespace**: `/events` protected by `JwtSocketGuard` authenticating the handshake token.
- **Room Segmentation**:
  - `hospital:global`: Global hospital operational metrics and dashboard revenue updates (`dashboard.updated`).
  - `department:pharmacy`: Real-time updates alerting pharmacists that a patient's payment is confirmed and medication release is unlocked (`payment.completed`, `patient.ready`).
  - `department:reception`: Live invoice payment confirmations and virtual account statuses (`invoice.updated`).
  - `invoice:{invoiceId}`: Dedicated room for patient/receptionist waiting screen to auto-refresh when payment hits the bank.

---

## 7. Complete Phase-by-Phase Execution Plan

### Phase 1: Core Infrastructure, Configuration & Architecture Scaffolding
- **1.1** Install required production dependencies (`@nestjs/mongoose`, `mongoose`, `@nestjs/config`, `@nestjs/event-emitter`, `@nestjs/swagger`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `ioredis`, `bullmq`, `@nestjs/bullmq`, `@nestjs/platform-socket.io`, `@nestjs/websockets`, `@nestjs/throttler`, `helmet`, `class-validator`, `class-transformer`, `pino-http`, `nestjs-pino`, `@aws-sdk/client-s3`).
- **1.2** Set up type-safe environment variables and configuration files inside `src/config/`.
- **1.3** Implement Global Shared Kernel inside `src/common/`:
  - `GlobalHttpExceptionFilter` & `MongoExceptionFilter` with standardized error responses.
  - `TransformResponseInterceptor` for consistent `{ success: true, data: ..., timestamp: ... }` wrapper.
  - Base Repository interface and Abstract Mongoose Repository inside `src/infrastructure/database/base.repository.ts`.
- **1.4** Configure Pino JSON structured logging and `@nestjs/terminus` health indicators (`/health`, `/ready`).

### Phase 2: Security, Authentication, RBAC & User Management Module
- **2.1** Create `AuditModule` with atomic log insertion service so all subsequent modules can log critical actions.
- **2.2** Build Mongoose schemas for `roles`, `permissions`, `users`, and `sessions`.
- **2.3** Seed initial system roles (`ADMIN`, `STAFF`).
- **2.4** Build `AuthModule`:
  - `POST /api/v1/auth/login` (Returns access token + hashed refresh token session).
  - `POST /api/v1/auth/refresh` (Session rotation & validation).
  - `POST /api/v1/auth/logout` (Session invalidation).
  - `GET /api/v1/auth/profile` & `PATCH /api/v1/auth/change-password`.
- **2.5** Build `UsersModule` & `RolesModule` with strict CRUD endpoints, repository layer, and `@Roles()` / `@Permissions()` guards.

### Phase 3: Patient & Billing Management Modules
- **3.1** Build `PatientsModule`:
  - Mongoose schema, auto-generating `patientNumber` (`PAT-YYYY-XXXXXX`).
  - `POST /api/v1/patients`, `GET /api/v1/patients` (with pagination, search, and filtering by phone/name), `GET /api/v1/patients/:id/invoices`.
- **3.2** Build `BillingModule`:
  - Schemas for `Invoice`, `InvoiceItem`, and `VirtualAccount`.
  - Service layer for invoice creation (`POST /api/v1/invoices`), state management, and item updates.
  - Implement dynamic calculation of totals and `EventEmitter` hooks upon invoice creation (`InvoiceCreated`).

### Phase 4: Monnify Payment Integration & Webhook Processing Engine
- **4.1** Build `MonnifyClientService` inside `PaymentsModule`:
  - HTTP integration with Monnify OAuth2 access token generation.
  - `POST /api/v1/invoices/:id/generate-account`: Calls Monnify API to reserve a dynamic NUBAN virtual account specifically tied to the invoice and stores it in `virtual_accounts`.
- **4.2** Build `POST /api/v1/webhooks/monnify` Endpoint:
  - Implement custom raw-body capture middleware for HMAC-SHA512 signature verification (`X-Monnify-Signature`).
  - Implement atomic, idempotent transaction processing: verify amount, verify reference against duplicates, update `Payment` document, and mark `Invoice` status to `PAID`.
  - Emit `PaymentCompleted` domain event on successful transaction completion.

### Phase 5: Receipt Generation, R2 Storage & QR Verification Engine
- **5.1** Build `ReceiptsModule` triggered by `PaymentCompleted` event or BullMQ worker:
  - Generate cryptographically secure signed JWT string containing invoice number, amount paid, patient ID, timestamp, and hospital digital signature.
  - Generate QR Code data URL embedding the verification link and signed JWT.
  - Generate professional hospital PDF receipt (`PDFKit`) including QR code and itemized billing summary.
  - Upload PDF directly to Cloudflare R2 via `@aws-sdk/client-s3` and store object keys in `receipts` collection.
- **5.2** Build `VerificationModule` for security guards and pharmacy staff:
  - `POST /api/v1/verification/receipt`: Accepts scanned QR code or receipt number -> verifies cryptographic JWT signature -> checks real-time database payment confirmation -> increments verification audit count -> returns instant verification confirmation (`VALID_PAYMENT_CONFIRMED`).

### Phase 6: Multi-Channel Notification Dispatch Engine (WhatsApp + SMS + Queues)
- **6.1** Build `QueueModule` configuring BullMQ connections to Redis.
- **6.2** Build `NotificationsModule` with BullMQ processors (`notification.processor.ts`):
  - WhatsApp Cloud API messaging integration delivering PDF receipt links and payment confirmation.
  - Termii / Twilio SMS gateway integration delivering instant payment confirmation SMS.
  - Automated retry mechanisms and manual resend endpoints (`POST /api/v1/notifications/:id/resend`, `POST /api/v1/receipts/:id/resend`).

### Phase 7: Realtime Gateways, Analytics Dashboard & System Settings
- **7.1** Build `DashboardModule` using high-performance MongoDB aggregation pipelines:
  - `GET /api/v1/dashboard/summary` (Total revenue today, pending invoices, verified receipts).
  - `GET /api/v1/dashboard/revenue` (TimeSeries revenue breakdown).
  - `GET /api/v1/dashboard/payments` & `GET /api/v1/dashboard/recent-transactions`.
- **7.2** Build `SocketModule` (`EventsGateway`):
  - Connect WebSocket server to `EventEmitter2` listeners so all dashboard metrics and invoice rooms update instantly with zero polling.
- **7.3** Build `SettingsModule` for hospital operational configs (fee structures, notification toggles, receipt headers).

### Phase 8: Dockerization, Deployment Architecture & Final Quality Assurance
- **8.1** Create optimized multi-stage `Dockerfile` (Alpine Node build, pruning devDependencies, non-root user execution).
- **8.2** Create `docker-compose.yml` orchestrating NestJS API, MongoDB Replica Set, Redis, and MongoExpress/RedisCommander dev tools.
- **8.3** Create comprehensive automated e2e verification scripts (`test/webhook-hmac.e2e-spec.ts`, `test/verification-flow.e2e-spec.ts`).

---

## 8. Verification & QA Matrix

| Phase / Feature | Test Strategy | Pass Criteria |
| :--- | :--- | :--- |
| **Authentication & RBAC** | E2E & Unit Tests (`supertest`) | 100% rejection on unauthorized roles (`403 Forbidden`); valid JWT session rotation. |
| **Monnify Webhook HMAC** | Automated Cryptographic Mocking | Forged signature headers rejected with `401 Unauthorized`; exact matches processed idempotently. |
| **Idempotent Payments** | Concurrent Request Simulation | Sending 5 identical Monnify webhooks simultaneously results in exact 1 payment record creation and 0 duplicate balance updates. |
| **QR Code Verification** | Verification Endpoint E2E | Scanned QR tokens successfully decoded and validated against live receipt records; tampered JWT tokens rejected immediately. |
| **Realtime Gateways** | Socket.IO Client Test Harness | `payment.completed` broadcast received within <50ms of webhook completion by all subscribed pharmacy/reception rooms. |
