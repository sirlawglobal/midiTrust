# MediTrust API — Frontend & UX Integration Handoff

**Author:** Backend Team  
**Swagger Docs:** `http://localhost:3000/api/docs` (dev) | `https://your-render-url.onrender.com/api/docs` (staging)  
**Base URL:** `http://localhost:3000/api/v1` (dev) | `https://your-render-url.onrender.com/api/v1` (staging)  
**WebSocket Namespace:** `ws://localhost:3000/events` (dev)

---

> **Context:** MediTrust is a paperless, zero-reconciliation hospital billing system. The key problem it solves: *a patient pays via bank transfer and the cashier no longer has to manually check any bank app to confirm.* The system handles confirmation, receipt generation, and notification automatically.

---

## The Big Picture: System Flow

```
[Cashier Registers Patient] → [Cashier Creates Invoice] → [Monnify Generates Bank Account]
       ↓                                ↓                              ↓
[Patient Profile Page]     [Invoice Page w/ Virtual Account]    [Patient pays to that account]
                                                                        ↓
                                            [Monnify hits our webhook] → [Payment confirmed]
                                                                        ↓
                                              [PDF Receipt generated in background]
                                                         ↓                      ↓
                                              [Real-time WebSocket push]   [Email + SMS sent]
```

---

## 1. Authentication

All endpoints (except `/auth/login` and `/verification/verify`) require a Bearer token in the `Authorization` header.

### Login
**`POST /auth/login`** — No auth required
```json
// REQUEST
{ "email": "admin@meditrust-hospital.com", "password": "SuperSecretAdmin2026!" }

// RESPONSE 200
{
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a94a8fe5ccb19ba61c4...",
    "user": {
      "_id": "6874a...",
      "email": "admin@meditrust-hospital.com",
      "firstName": "Super",
      "lastName": "Admin",
      "role": { "name": "ADMIN", "permissions": ["PATIENTS_CREATE", "INVOICES_CREATE", ...] }
    }
  }
}
```

> [!IMPORTANT]
> **Token Lifetimes:** `accessToken` expires in **15 minutes**. `refreshToken` is long-lived (stored in your session). When the API returns `401 Unauthorized`, call the refresh endpoint silently to get a new access token *before* showing a login screen to the user.

### Refresh Token
**`POST /auth/refresh`** — No auth required
```json
// REQUEST
{ "refreshToken": "a94a8fe5ccb19ba61c4..." }

// RESPONSE 200 — returns a brand-new access + refresh token pair
{ "data": { "accessToken": "new-token...", "refreshToken": "new-refresh..." } }
```

> [!WARNING]
> **Token Rotation:** Each successful refresh **invalidates the previous refresh token**. If two browser tabs try to refresh simultaneously, one will fail. The recommended pattern is to intercept all 401s with a single shared promise (axios interceptor singleton) so only one refresh call fires at a time.

### Logout
**`POST /auth/logout`** — Auth required
```json
// REQUEST — include the refresh token to revoke only this session
{ "refreshToken": "a94a8fe5ccb19ba61c4..." }
// or send empty body to revoke ALL sessions
```

### Change Password
**`POST /auth/change-password`** — Auth required
```json
{ "currentPassword": "old", "newPassword": "New@Password123!" }
```

---

## 2. Role-Based UI Access

The login response includes the user's **permissions array**. Use this to show/hide UI elements — not just routes.

| Permission | What the UI should show |
|---|---|
| `PATIENTS_CREATE` | "Register Patient" button |
| `PATIENTS_READ` | Patient directory & profile pages |
| `PATIENTS_UPDATE` | Edit patient form |
| `INVOICES_CREATE` | "Create Invoice" button |
| `INVOICES_READ` | Invoice list & detail pages |
| `INVOICES_CANCEL` | "Cancel Invoice" button |
| `VIRTUAL_ACCOUNTS_GENERATE` | Payment collection screen |
| `PAYMENTS_READ` | Payments history |
| `RECEIPTS_READ` | Receipts table |
| `RECEIPTS_RESEND` | "Resend Receipt" button |
| `RECEIPT_VERIFY` | Verification scanner page |
| `DASHBOARD_READ` | Analytics dashboard |

> [!TIP]
> The `ADMIN` role has all permissions. `STAFF` has the subset listed above. Store the `permissions` array after login and create a helper function `hasPermission(perm: string): boolean` to gate buttons and routes.

---

## 3. Patients

**Base path:** `/patients`  
**All routes require:** `Authorization: Bearer <token>` header

### Create Patient — `POST /patients`
```json
// REQUEST
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "gender": "MALE",           // "MALE" | "FEMALE" | "OTHER"
  "email": "john@example.com",
  "phone": "+2348012345678",
  "address": "12 Lagos Street, Ikeja",
  "bloodGroup": "O+",         // optional
  "genotype": "AA"            // optional
}

// RESPONSE 201
{ "data": { "_id": "6874a...", "patientNumber": "MED-0001", ...all fields } }
```

> [!NOTE]
> The `patientNumber` (e.g., `MED-0001`) is auto-generated by the system and is what you should show prominently on the Patient Profile card, not the MongoDB `_id`.

### List Patients — `GET /patients`
Supports **pagination and search**:
```
GET /patients?page=1&limit=20&search=John
```
```json
// RESPONSE 200
{
  "data": [...array of patients],
  "meta": {
    "total": 250,
    "page": 1,
    "limit": 20,
    "totalPages": 13
  }
}
```
> [!TIP]
> Use the `meta` object to render a **pagination component**. `totalPages` tells you how many pages to render. Increment `page` in the query param when the user clicks Next.

### Get One Patient — `GET /patients/:id`
```json
// RESPONSE 200
{ "data": { "_id": "6874a...", "patientNumber": "MED-0001", "firstName": "John", ... } }
```

### Update Patient — `PATCH /patients/:id`
Send only the fields you want to change (partial update):
```json
{ "phone": "+2348099999999", "address": "New address" }
```

---

## 4. Billing (Invoices)

**Base path:** `/billing/invoices`

### Create Invoice — `POST /billing/invoices`
```json
// REQUEST
{
  "patientId": "6874a...",
  "items": [
    {
      "description": "General Consultation",
      "quantity": 1,
      "unitPrice": 5000,
      "serviceCode": "CONSULT-01",
      "department": "OPD"
    },
    {
      "description": "Malaria Blood Test",
      "quantity": 1,
      "unitPrice": 3500,
      "serviceCode": "LAB-MALARIA",
      "department": "LABORATORY"
    }
  ]
}

// RESPONSE 201
{
  "data": {
    "_id": "invoice-id...",
    "invoiceNumber": "INV-2026-0042",
    "status": "PENDING_PAYMENT",
    "subTotal": 8500,
    "taxTotal": 0,
    "grandTotal": 8500,
    "items": [...],
    "virtualAccount": {          // ← This is the bank account where the patient pays
      "accounts": [
        {
          "bankName": "Wema Bank",
          "accountNumber": "9876543210",
          "accountName": "MediTrust - John Doe"
        },
        {
          "bankName": "Sterling Bank",
          "accountNumber": "1234567890",
          "accountName": "MediTrust - John Doe"
        }
      ],
      "expiresAt": "2026-07-19T14:30:00.000Z"
    }
  }
}
```

> [!IMPORTANT]
> The `virtualAccount.accounts` array may contain **multiple banks**. Display all of them as selectable options (like how fintech apps show "Pay with GTB / Wema / Sterling"). The patient can transfer from any.

### Invoice Statuses
| Status | Meaning | UI Colour |
|---|---|---|
| `PENDING_PAYMENT` | Awaiting transfer | 🟡 Yellow |
| `PARTIALLY_PAID` | Underpaid | 🟠 Orange |
| `PAID` | Fully settled | 🟢 Green |
| `CANCELLED` | Voided | 🔴 Red |

### List Invoices — `GET /billing/invoices`
Same pagination pattern: `?page=1&limit=20`

### Update Invoice Items — `PATCH /billing/invoices/:id/items`
Can only be done when invoice is `PENDING_PAYMENT`.

### Cancel Invoice — `PATCH /billing/invoices/:id/cancel`
Cannot cancel a `PAID` invoice (returns `400`).

---

## 5. Payments

**`GET /payments`** — List all payments (paginated)  
**`GET /payments/:id`** — Get one payment

The `POST /payments/webhook` endpoint is called **only by Monnify's servers**, never directly from your frontend. Do not expose this in any UI.

---

## 6. Receipts

**Base path:** `/receipts`

**`GET /receipts`** — List all receipts (paginated)  
**`GET /receipts/:id`** — Get a specific receipt

A receipt object looks like:
```json
{
  "_id": "...",
  "receiptNumber": "RCP-1721323456789",
  "pdfUrl": "https://res.cloudinary.com/dzoewlcdy/..../RCP-17213.pdf",
  "qrCodeDataUrl": "data:image/png;base64,...",
  "issuedAt": "2026-07-18T14:30:00.000Z",
  "signedJwtToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**`POST /receipts/:id/resend`** — Manually re-queue the email + SMS delivery for a receipt.

> [!TIP]
> The `pdfUrl` is a **direct Cloudinary link**. You can open it in a new tab, embed it in an `<iframe>` for a preview modal, or display it as a download link. Don't try to proxy it through your frontend server.

---

## 7. Verification (Public — No Auth Required)

**`POST /verification/verify`** — **This is the ONLY endpoint with no authentication.**
```json
// REQUEST — the token comes from scanning the QR code in the receipt PDF
{ "token": "eyJhbGciOiJIUzI1NiIs..." }

// RESPONSE 200 — Valid receipt
{
  "data": {
    "isValid": true,
    "receipt": {
      "receiptNumber": "RCP-1721323456789",
      "patientName": "John Doe",
      "amountPaid": 8500,
      "invoiceNumber": "INV-2026-0042",
      "issuedAt": "2026-07-18T14:30:00.000Z"
    }
  }
}

// RESPONSE 401 — Tampered or expired token
{ "statusCode": 401, "message": "Invalid or expired receipt token" }
```

> [!IMPORTANT]
> **URL Structure for QR Code:** When a patient scans the QR code, they are sent to `https://your-domain.com/verify?token=eyJhbGciOiJIUzI1NiIs...`. Your frontend should read the `token` query parameter and call this endpoint on page load. No login button, no form — it should be fully automatic.

---

## 8. Notifications

**`GET /notifications`** — Get notification history (all email, SMS, WhatsApp deliveries)

This is useful for a **"Delivery History"** tab on the admin panel — showing timestamps and delivery status of all outbound messages.

> [!NOTE]
> **How notifications are triggered under the hood:**
> The notifications are sent at the very end of a fully automated chain of events. Here is the exact timeline of what happens behind the scenes:
> 
> 1. **The Trigger:** The patient transfers money to the Monnify Virtual Account.
> 2. **The Webhook:** Monnify immediately sends a webhook to our server (`POST /api/v1/payments/webhook`).
> 3. **The Verification:** Our server receives the webhook and actively calls Monnify's API back to verify that the transaction is 100% legitimate (the anti-fraud check).
> 4. **Invoice Update:** Once verified, the server marks the Invoice as PAID and fires a `payment.completed` internal event.
> 5. **Receipt Queued:** The Receipts Service hears the `payment.completed` event and sends a job to a background worker queue (BullMQ) to generate the receipt.
> 6. **PDF Generation & Upload:** The background worker generates the PDF receipt, embeds the QR code, uploads the file to the cloud (Cloudinary), and fires a `receipt.generated` event.
> 7. **Notification Queued:** The Notifications Service hears the `receipt.generated` event. It sees that the patient has an email or phone number, saves a notification record to the database, and sends it to the notification background queue.
> 8. **The Delivery:** The Notification Worker picks up the job, connects to Brevo (our email provider), attaches the PDF link, and sends the email and SMS.
> 
> **In short:** The notification is sent immediately after the payment clears, the PDF is successfully generated, and the PDF is uploaded to the cloud. If any step in this chain fails (e.g., the payment webhook is fake, or Cloudinary is down and can't accept the PDF), the notification will not be sent, preventing the patient from receiving a broken receipt link!

---

## 9. Dashboard & Analytics (Admin Only)

**`GET /dashboard/summary`** — Key stats for the homepage card tiles

Returns metrics like total revenue today, number of invoices, patients registered, pending payments. Use these to build your KPI card grid on the admin homepage.

---

## 10. Settings (Admin Only)

**`GET /settings`** — Fetch system-wide settings  
**`PATCH /settings`** — Update a setting

Settings drive dynamic content like `hospitalName` and `hospitalAddress` that appear on every PDF receipt. The admin should be able to update these without a code deployment.

---

## 11. Real-Time WebSocket Catalogue

**Connection URL:** `ws://localhost:3000/events` (note the `/events` namespace)

### How to connect (JavaScript)
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/events', {
  auth: { token: 'YOUR_ACCESS_TOKEN' } // Pass JWT here
});

socket.on('connect', () => {
  // Join the rooms relevant to this user
  socket.emit('join_room', 'hospital:global');
  socket.emit('join_room', 'department:reception');
});
```

### Available Rooms

| Room Name | Who should join | Description |
|---|---|---|
| `hospital:global` | Admins, Dashboard screens | Receives all high-level events |
| `department:reception` | Receptionists | Payment + invoice events |
| `department:pharmacy` | Pharmacy staff | Notified when patient's payment clears |
| `invoice:<invoiceId>` | The specific patient's screen | Only events for that invoice |

### Events You Will Receive

| Event Name | Room Broadcast To | Payload | What to do in UI |
|---|---|---|---|
| `payment.completed` | `department:reception`, `department:pharmacy`, `invoice:<id>` | `{ invoiceId, amountPaid, paymentReference, patientId }` | Flash "Payment Received! 🎉" banner, update invoice status to PAID |
| `invoice.created` | `department:reception`, `hospital:global` | `{ invoiceId, invoiceNumber, patientId, grandTotal }` | Add new row to invoice table, show toast notification |
| `dashboard.updated` | `hospital:global` | `{ action: 'payment_received' \| 'invoice_created' }` | Silently re-fetch dashboard stats |

---

## 12. Standard Error Response Format

Every API error follows the same shape. Make sure your HTTP client catches it properly:

```json
{
  "statusCode": 400,
  "message": "Patient with this phone number already exists.",
  "error": "Conflict"
}
```

| Status Code | Meaning | UI Action |
|---|---|---|
| `400 Bad Request` | Validation failed / bad input | Show `message` field in a toast or below the relevant form field |
| `401 Unauthorized` | Token missing or expired | Silently call `/auth/refresh`. If that fails too, redirect to login |
| `403 Forbidden` | Valid token but wrong permissions | Show "You don't have permission to do this" |
| `404 Not Found` | Resource doesn't exist | Show an empty state or "Not Found" page |
| `409 Conflict` | Duplicate (e.g., duplicate phone) | Show `message` inline near the phone number field |
| `429 Too Many Requests` | Rate limit hit (100 req/min) | Show "Too many requests, please wait a moment" |
| `500 Internal Server Error` | Unexpected backend crash | Show a generic "Something went wrong, please try again" |

---

## 13. Pages / Screens Needed

| Screen | Route (suggestion) | Key API Calls |
|---|---|---|
| Login | `/login` | `POST /auth/login` |
| Dashboard (Admin) | `/dashboard` | `GET /dashboard/summary` + WebSocket |
| Patient Directory | `/patients` | `GET /patients?page=&search=` |
| Register Patient | `/patients/new` | `POST /patients` |
| Patient Profile | `/patients/:id` | `GET /patients/:id`, `GET /billing/invoices?patientId=` |
| Create Invoice | `/billing/new` | `POST /billing/invoices` |
| Invoice Detail / Payment Screen | `/billing/:invoiceId` | `GET /billing/invoices/:id` + WebSocket `invoice:<id>` room |
| Invoices List | `/billing` | `GET /billing/invoices` |
| Receipts List | `/receipts` | `GET /receipts` |
| Receipt Detail | `/receipts/:id` | `GET /receipts/:id` |
| Public Verification | `/verify` | `POST /verification/verify` (no auth) |
| Notification History | `/notifications` | `GET /notifications` |
| System Settings | `/settings` | `GET /settings`, `PATCH /settings` |
| User Management | `/users` | Admin only |

---

## 14. UX/UI Non-Negotiables

- **Loading states:** Every API call needs a spinner or skeleton screen. Never show a blank white screen while waiting.
- **Optimistic UI:** When cancelling an invoice, update the status in the UI immediately and roll back if the API returns an error.
- **Monospaced font:** Use a monospaced font (e.g., `font-mono`) for bank account numbers, receipt numbers, and invoice IDs.
- **Copy to clipboard:** Any account number or reference code must have a "Copy" button beside it.
- **Session expiry:** When the access token expires and the silent refresh also fails, show a **polite modal**: *"Your session has expired. Please log in again."* — not a jarring redirect.
- **Offline indicator:** Show a banner if the WebSocket disconnects. Real-time features won't work without it.
- **PDF rendering:** Use an `<iframe>` to embed the PDF receipt directly in-app. Do NOT force a download as the default action. Provide separate "View" and "Download" options.
