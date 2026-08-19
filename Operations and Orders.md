# Operations and Orders — Ruhvi Internal Portal Implementation Checklist

## Purpose

Build a production-ready internal portal architecture for Ruhvi with strict separation between:

- `admin.ruhvi.in`
- `operations.ruhvi.in`
- `orders.ruhvi.in`
- `support.ruhvi.in`
- `auth.ruhvi.in`

The system must use centralized authentication with strict role-based and permission-based authorization.

## Non-Negotiable Rules

- Do NOT break or remove any existing Ruhvi functionality.
- Do NOT change the existing customer-facing light theme.
- Preserve existing authentication providers and working authentication flows unless a change is required for this architecture.
- Do NOT rely on frontend UI hiding for security.
- Every protected route and sensitive API/database operation must be authorized server-side/backend-side.
- Operations users must not access Orders or Support unless explicitly granted.
- Orders users must not access Operations or Support unless explicitly granted.
- Support users must not access Operations or Orders modification functions unless explicitly granted.
- Managers may access only the modules and actions assigned to them.
- Admins may access the administrative modules allowed to their role.
- Super Admins have global access.
- Never trust a role, department, portal, or permission value sent from the client.
- Never expose secrets, API keys, payment credentials, or sensitive configuration to restricted users.
- Complete and verify each numbered phase before moving to the next phase.
- Do not skip failed checklist items. Fix the failure and re-run the relevant verification.
- Keep an implementation log of completed phases and unresolved issues.

---

# Phase 1 — Pre-Implementation Audit

- [ ] 1.1 Inspect the existing Ruhvi repository structure.
- [ ] 1.2 Identify the current frontend framework and routing architecture.
- [ ] 1.3 Identify the current Firebase project and Firebase configuration.
- [ ] 1.4 Identify the current authentication implementation.
- [ ] 1.5 Identify all currently enabled authentication providers.
- [ ] 1.6 Identify existing user/profile collections and schemas.
- [ ] 1.7 Identify current database collections/tables related to users, products, orders, support, inventory, and payments.
- [ ] 1.8 Identify existing backend/API/server functions.
- [ ] 1.9 Identify existing environment variables and secrets.
- [ ] 1.10 Identify current deployment configuration.
- [ ] 1.11 Identify existing domains and subdomains.
- [ ] 1.12 Identify any existing admin dashboard implementation.
- [ ] 1.13 Identify existing Operations, Orders, or Support functionality so it is not duplicated.
- [ ] 1.14 Create a dependency/impact map before modifying existing code.
- [ ] 1.15 Document all existing functionality that must remain unchanged.
- [ ] 1.16 Verify the current application builds successfully before modifications.
- [ ] 1.17 Verify the current authentication flow works before modifications.

### Phase 1 Gate

- [ ] Existing architecture documented.
- [ ] Existing authentication documented.
- [ ] Existing data model documented.
- [ ] Existing deployment documented.
- [ ] Baseline build passes.
- [ ] Baseline authentication test passes.

**Do not continue until every item above passes.**

---

# Phase 2 — Define Portal Architecture

Create and document these portals:

| Portal | Domain | Purpose |
|---|---|---|
| Admin | `admin.ruhvi.in` | Administrative control center |
| Operations | `operations.ruhvi.in` | Products, inventory, CMS, website operations, marketing operations |
| Orders | `orders.ruhvi.in` | Orders, shipping, labels, manifests, delivery, returns, exchange, RTO |
| Support | `support.ruhvi.in` | Customer support, tickets, conversations, order lookup |
| Marketing | `marketing.ruhvi.in` | Campaigns, coupons, promotions, audiences, messaging, ads, marketing analytics |
| Auth | `auth.ruhvi.in` | Central authentication flow |

- [ ] 2.1 Create a central portal configuration.
- [ ] 2.2 Define unique portal identifiers.
- [ ] 2.3 Define domain-to-portal mapping.
- [ ] 2.4 Define which portals require authentication.
- [ ] 2.5 Define which roles may access each portal.
- [ ] 2.6 Ensure portal authorization is independent of login credentials.
- [ ] 2.7 Ensure users cannot access an unauthorized portal by manually entering its URL.
- [ ] 2.8 Define a standard `403 Forbidden` response/page.
- [ ] 2.9 Define session-expired behavior.
- [ ] 2.10 Define disabled/terminated account behavior.

### Phase 2 Gate

- [ ] Portal map exists.
- [ ] Domain mapping exists.
- [ ] Unauthorized portal behavior is defined.
- [ ] No automatic cross-portal redirect is required.
- [ ] Each portal has a clearly defined responsibility.

---

# Phase 3 — Authentication Foundation

Use the existing Firebase Authentication system where possible.

- [ ] 3.1 Verify Firebase Authentication configuration.
- [ ] 3.2 Verify Email/Password authentication.
- [ ] 3.3 Verify Google authentication if currently enabled.
- [ ] 3.4 Verify Facebook authentication if currently enabled.
- [ ] 3.5 Verify all existing authentication providers remain functional.
- [ ] 3.6 Configure required authorized domains.
- [ ] 3.7 Configure OAuth redirect/callback settings where applicable.
- [ ] 3.8 Keep authentication centralized.
- [ ] 3.9 Ensure authentication identifies the user only.
- [ ] 3.10 Keep authorization logic separate from authentication.
- [ ] 3.11 Implement secure session handling.
- [ ] 3.12 Implement logout.
- [ ] 3.13 Implement session-expiration handling.
- [ ] 3.14 Implement disabled-account handling.
- [ ] 3.15 Implement re-authentication for sensitive actions where required.

### Phase 3 Gate

Test at minimum:

- [ ] Valid user can log in.
- [ ] Invalid credentials are rejected.
- [ ] Logout works.
- [ ] Expired session is rejected.
- [ ] Disabled user is rejected.
- [ ] Existing customer authentication is not broken.
- [ ] Existing OAuth flows are not broken.

---

# Phase 4 — User Data Model

Create/normalize the employee/user model.

Recommended structure:

```text
users/{uid}
  uid
  name
  email
  phone
  employeeId
  status
  roleId
  departmentId
  allowedPortals
  createdAt
  updatedAt
  lastLoginAt
```

- [ ] 4.1 Create/verify the employee user collection.
- [ ] 4.2 Add unique employee ID.
- [ ] 4.3 Add account status.
- [ ] 4.4 Add role reference.
- [ ] 4.5 Add department reference.
- [ ] 4.6 Add allowed portal list.
- [ ] 4.7 Add created/updated timestamps.
- [ ] 4.8 Add last-login tracking.
- [ ] 4.9 Do not store passwords in application database.
- [ ] 4.10 Do not store secrets in user profiles.
- [ ] 4.11 Migrate existing internal users safely.
- [ ] 4.12 Preserve existing customer user records.

### Phase 4 Gate

- [ ] Existing users remain functional.
- [ ] Employee records can be uniquely identified.
- [ ] Employee status can be changed.
- [ ] Role/department/portal relationships work.

---

# Phase 5 — Departments

Create:

```text
operations
orders
support
finance
marketing
inventory
management
```

- [ ] 5.1 Create department model.
- [ ] 5.2 Create department IDs.
- [ ] 5.3 Allow a user to be assigned to a department.
- [ ] 5.4 Prevent unauthorized users from changing departments.
- [ ] 5.5 Make department available to authorization logic.
- [ ] 5.6 Keep department separate from role.
- [ ] 5.7 Keep department separate from portal permission.

### Phase 5 Gate

- [ ] Department assignment works.
- [ ] Department changes are audited.
- [ ] Department does not automatically grant unauthorized permissions.

---

# Phase 6 — Roles

Create base roles:

```text
SUPER_ADMIN
ADMIN
MANAGER
STAFF
```

Create specialized roles:

```text
operations_manager
orders_manager
support_manager
inventory_manager
marketing_manager
finance_manager

operations_staff
orders_staff
support_staff
inventory_staff
```

- [ ] 6.1 Create roles collection/model.
- [ ] 6.2 Define role IDs.
- [ ] 6.3 Define role display names.
- [ ] 6.4 Define role descriptions.
- [ ] 6.5 Define department association where appropriate.
- [ ] 6.6 Define role hierarchy if required.
- [ ] 6.7 Ensure Super Admin is globally authorized.
- [ ] 6.8 Prevent normal users from assigning themselves a role.
- [ ] 6.9 Audit role changes.

### Phase 6 Gate

- [ ] Roles can be created.
- [ ] Roles can be assigned by authorized administrators.
- [ ] Role changes are audited.
- [ ] Self-promotion is impossible.

---

# Phase 7 — Permission System

Implement granular permissions.

## Product Permissions

```text
products.view
products.create
products.edit
products.delete
products.publish
```

## Inventory Permissions

```text
inventory.view
inventory.adjust
inventory.transfer
inventory.receive
inventory.damage
inventory.export
```

## Order Permissions

```text
orders.view
orders.create
orders.edit
orders.cancel
orders.assign
```

## Shipping Permissions

```text
shipping.view
shipping.create_label
shipping.create_manifest
shipping.ship
shipping.track
shipping.courier_manage
```

## Returns / Exchange

```text
returns.view
returns.approve
returns.reject
returns.process

exchange.view
exchange.approve
exchange.process
```

## Refund Permissions

```text
refunds.view
refunds.create
refunds.approve
refunds.process
```

## CMS Permissions

```text
cms.view
cms.edit
cms.publish

banner.view
banner.create
banner.edit
banner.delete
banner.publish

hero.view
hero.edit
hero.publish
```

## Marketing Permissions

```text
coupons.view
coupons.create
coupons.edit
coupons.delete

campaigns.view
campaigns.create
campaigns.edit
campaigns.publish

# Marketing / Audience
audiences.view
audiences.create
audiences.edit

# Email Marketing
email_campaigns.view
email_campaigns.create
email_campaigns.schedule
email_campaigns.send

# WhatsApp / Messaging
whatsapp_campaigns.view
whatsapp_campaigns.create
whatsapp_campaigns.send

# Ads
ads.view
ads.create
ads.edit
ads.publish

# Marketing Analytics
marketing_analytics.view
marketing_analytics.export
```

## Support Permissions

```text
support.view
support.reply
support.assign
support.close
support.escalate
```

## Customer Permissions

```text
customers.view
customers.edit
```

## Finance Permissions

```text
finance.view
finance.export
payments.view
refunds.view
refunds.process
```

## Team Management Permissions

```text
users.view
users.create
users.edit
users.disable

roles.view
roles.create
roles.edit

permissions.view
permissions.assign
```

- [ ] 7.1 Create centralized permission registry.
- [ ] 7.2 Give every permission a stable ID.
- [ ] 7.3 Group permissions by module.
- [ ] 7.4 Attach permissions to roles.
- [ ] 7.5 Implement permission checking helpers.
- [ ] 7.6 Implement server-side permission checking.
- [ ] 7.7 Implement frontend permission checking.
- [ ] 7.8 Never rely on frontend permission checks alone.
- [ ] 7.9 Do not send the entire permission matrix through Firebase Custom Claims.
- [ ] 7.10 Keep Custom Claims small.
- [ ] 7.11 Ensure permission changes are audited.

### Phase 7 Gate

Test:

- [ ] User without `products.view` cannot open products.
- [ ] User without `products.edit` cannot edit products.
- [ ] User without `orders.cancel` cannot cancel orders.
- [ ] User without `shipping.create_label` cannot create labels.
- [ ] User without `refunds.process` cannot process refunds.
- [ ] User without `users.edit` cannot modify employees.
- [ ] Direct API calls are also denied.

---

# Phase 8 — Role Permission Bundles

Create default permission bundles.

## Operations Manager

```text
products.*
inventory.*
cms.*
banner.*
hero.*
coupons.view
coupons.create
coupons.edit
campaigns.view
campaigns.create
campaigns.edit
```

## Orders Manager

```text
orders.*
shipping.*
returns.*
exchange.*
refunds.view
```

## Support Manager

```text
support.*
customers.view
orders.view
returns.view
```

## Operations Staff

Only operational permissions explicitly required for the employee.

## Orders Staff

Only order/fulfillment permissions explicitly required.

## Support Staff

Only support permissions explicitly required.

- [ ] 8.1 Create role templates.
- [ ] 8.2 Allow authorized admins to customize templates.
- [ ] 8.3 Support individual permission overrides.
- [ ] 8.4 Display effective permissions before saving.
- [ ] 8.5 Audit permission changes.

### Phase 8 Gate

- [ ] Every default role has an explicit permission set.
- [ ] Managers cannot automatically access unrelated departments.
- [ ] Staff permissions are narrower than manager permissions.

---

# Phase 9 — Portal Authorization

Implement:

```text
hasPortalAccess(user, portal)
```

Required behavior:

```text
Operations user
→ operations.ruhvi.in = ALLOW
→ orders.ruhvi.in = DENY
→ support.ruhvi.in = DENY

Orders user
→ orders.ruhvi.in = ALLOW
→ operations.ruhvi.in = DENY
→ support.ruhvi.in = DENY

Support user
→ support.ruhvi.in = ALLOW
→ operations.ruhvi.in = DENY
→ orders.ruhvi.in = DENY

Super Admin
→ all portals = ALLOW
```

- [ ] 9.1 Detect current portal from trusted host configuration.
- [ ] 9.2 Never trust a client-provided portal value.
- [ ] 9.3 Check authenticated user.
- [ ] 9.4 Check active account status.
- [ ] 9.5 Check allowed portal.
- [ ] 9.6 Return 403 when unauthorized.
- [ ] 9.7 Do not automatically redirect unauthorized users to another portal.
- [ ] 9.8 Do not expose restricted portal data in the error response.

### Phase 9 Gate

Manually test every portal combination.

- [ ] Operations → Operations allowed.
- [ ] Operations → Orders denied.
- [ ] Operations → Support denied.
- [ ] Orders → Orders allowed.
- [ ] Orders → Operations denied.
- [ ] Orders → Support denied.
- [ ] Support → Support allowed.
- [ ] Support → Operations denied.
- [ ] Support → Orders denied.
- [ ] Super Admin → all allowed.

---

# Phase 10 — Admin Dashboard RBAC

`admin.ruhvi.in` must be permission-aware.

- [ ] 10.1 Create dynamic sidebar.
- [ ] 10.2 Hide modules without permission.
- [ ] 10.3 Protect routes without permission.
- [ ] 10.4 Protect APIs without permission.
- [ ] 10.5 Protect database operations.
- [ ] 10.6 Show only allowed dashboard widgets.
- [ ] 10.7 Show only allowed actions/buttons.
- [ ] 10.8 Keep Super Admin unrestricted.
- [ ] 10.9 Allow Managers to log in only if their role grants Admin portal access.
- [ ] 10.10 Do not assume every Manager gets full Admin access.

### Example

Operations Manager sees:

```text
Dashboard
Products
Inventory
Website
Marketing
```

But not:

```text
Finance
Security
User Management
Payment Settings
```

### Phase 10 Gate

- [ ] Manager sees only permitted modules.
- [ ] Direct URL access to hidden modules is denied.
- [ ] Direct API access is denied.
- [ ] Super Admin sees all modules.

---

# Phase 11 — Team & Access Management

Create:

```text
Admin → Team & Access
```

Sections:

```text
Employees
Departments
Roles
Permissions
Portal Access
Access Requests
Audit Logs
```

Employee creation flow:

```text
Name
Email
Phone
Employee ID
Department
Role
Portal
Permissions
Status
```

- [ ] 11.1 Build employee list.
- [ ] 11.2 Build employee details.
- [ ] 11.3 Build Add Employee.
- [ ] 11.4 Build Edit Employee.
- [ ] 11.5 Build Disable Employee.
- [ ] 11.6 Build Role assignment.
- [ ] 11.7 Build Department assignment.
- [ ] 11.8 Build Portal assignment.
- [ ] 11.9 Build Permission assignment.
- [ ] 11.10 Build effective-permission preview.
- [ ] 11.11 Prevent unauthorized self-editing of permissions.
- [ ] 11.12 Audit every access change.

### Phase 11 Gate

- [ ] Admin can create employee.
- [ ] Admin can assign role.
- [ ] Admin can assign portal.
- [ ] Admin can assign permissions.
- [ ] Employee receives correct access.
- [ ] Removing access immediately prevents new authorized requests.

---

# Phase 12 — Operations Portal

Build `operations.ruhvi.in`.

## Dashboard

- [ ] 12.1 Operations overview.
- [ ] 12.2 Inventory summary.
- [ ] 12.3 Low-stock summary.
- [ ] 12.4 Product summary.
- [ ] 12.5 Website content summary.

## Products

- [ ] 12.7 Product list.
- [ ] 12.8 Add product.
- [ ] 12.9 Edit product.
- [ ] 12.10 Delete product according to permission.
- [ ] 12.11 Categories.
- [ ] 12.12 Collections.
- [ ] 12.13 Pricing.
- [ ] 12.14 Product media.
- [ ] 12.15 Product publishing.

## Inventory

- [ ] 12.16 Stock.
- [ ] 12.17 Warehouses.
- [ ] 12.18 Stock adjustment.
- [ ] 12.19 Stock transfer.
- [ ] 12.20 Damaged stock.
- [ ] 12.21 Low stock.
- [ ] 12.22 Inventory reports.

## Website CMS

- [ ] 12.23 Homepage.
- [ ] 12.24 Hero.
- [ ] 12.25 Banners.
- [ ] 12.26 Homepage sections.
- [ ] 12.27 Navigation.
- [ ] 12.28 Content pages.
- [ ] 12.29 Publish/unpublish workflow.

## Website Content / CMS Boundary

Operations owns the structural website/CMS layer. Marketing owns campaign execution.

- [ ] 12.30 Homepage structure/content management.
- [ ] 12.31 Hero and banner content management required by CMS.
- [ ] 12.32 Website sections and navigation.
- [ ] 12.33 Product/catalog content.
- [ ] 12.34 Allow controlled promotional placements only through explicit permissions/workflows.
- [ ] 12.35 Do NOT implement Campaigns, Coupons, Promotions, Audiences, Email Campaigns, WhatsApp Campaigns, Ads, or Marketing Analytics as Operations-owned modules.

### Phase 12 Gate

- [ ] Operations user can perform only assigned actions.
- [ ] Operations cannot access Orders.
- [ ] Operations cannot access Support.
- [ ] Operations cannot access restricted Finance data.

---

# Phase 13 — Marketing Portal

Build `marketing.ruhvi.in` as a completely separate internal platform. Marketing must not be treated as an Operations sub-module.

## Dashboard

- [ ] 15.1 Marketing overview.
- [ ] 15.2 Active campaign summary.
- [ ] 15.3 Coupon performance summary.
- [ ] 15.4 Promotion summary.
- [ ] 15.5 Audience summary.
- [ ] 15.6 Channel performance summary.
- [ ] 15.7 Revenue/conversion attribution summary.

## Campaigns

- [ ] 15.8 Campaign list.
- [ ] 15.9 Create campaign.
- [ ] 15.10 Edit campaign.
- [ ] 15.11 Schedule campaign.
- [ ] 15.12 Pause/resume campaign.
- [ ] 15.13 Publish campaign.
- [ ] 15.14 Campaign calendar.
- [ ] 15.15 Campaign status lifecycle.

## Coupons

- [ ] 15.16 Coupon list.
- [ ] 15.17 Create coupon.
- [ ] 15.18 Edit coupon.
- [ ] 15.19 Activate/deactivate coupon.
- [ ] 15.20 Coupon usage analytics.
- [ ] 15.21 Coupon restrictions and eligibility rules.

## Promotions / Offers

- [ ] 15.22 Promotion list.
- [ ] 15.23 Create promotion.
- [ ] 15.24 Edit promotion.
- [ ] 15.25 Publish/unpublish promotion.
- [ ] 15.26 Flash sales and promotional events.

## Audiences

- [ ] 15.27 Customer segments.
- [ ] 15.28 Audience creation.
- [ ] 15.29 Audience rules.
- [ ] 15.30 Audience activation/deactivation.

## Email Marketing

- [ ] 15.31 Email campaign creation.
- [ ] 15.32 Email template selection.
- [ ] 15.33 Scheduling.
- [ ] 15.34 Sending.
- [ ] 15.35 Email performance.

## WhatsApp / Messaging

- [ ] 15.36 WhatsApp campaign creation.
- [ ] 15.37 Template selection.
- [ ] 15.38 Scheduling/sending.
- [ ] 15.39 Delivery/performance analytics.

## Ads

- [ ] 15.40 Meta campaign management where integration supports it.
- [ ] 15.41 Google campaign management where integration supports it.
- [ ] 15.42 Tracking configuration.
- [ ] 15.43 Ad performance reporting.

## Marketing Analytics

- [ ] 15.44 Campaign performance.
- [ ] 15.45 Coupon performance.
- [ ] 15.46 Conversion attribution.
- [ ] 15.47 Revenue attribution.
- [ ] 15.48 ROI reporting.
- [ ] 15.49 Export according to permission.

## Marketing ↔ Operations Boundary

- [ ] 15.50 Marketing can request/use approved website placements without gaining broad CMS administration rights.
- [ ] 15.51 Operations retains structural CMS control.
- [ ] 15.52 Marketing does not receive inventory administration permissions by default.
- [ ] 15.53 Marketing does not receive order modification permissions by default.
- [ ] 15.54 Marketing does not receive customer-support management permissions by default.
- [ ] 15.55 Marketing does not receive payment/refund administration permissions by default.

### Phase 13 Gate

- [ ] Marketing users can access `marketing.ruhvi.in` only when explicitly assigned.
- [ ] Marketing users cannot access `operations.ruhvi.in` unless explicitly granted.
- [ ] Marketing users cannot access `orders.ruhvi.in` unless explicitly granted.
- [ ] Marketing users cannot access `support.ruhvi.in` unless explicitly granted.
- [ ] Campaign permissions are enforced at route, API, and database/backend levels.
- [ ] Operations users cannot access Marketing modules unless explicitly granted.

# Phase 14 — Orders Portal

Build `orders.ruhvi.in`.

## Dashboard

- [ ] 15.1 Today's orders.
- [ ] 15.2 Pending orders.
- [ ] 15.3 Processing.
- [ ] 15.4 Ready to ship.
- [ ] 15.5 Shipped.
- [ ] 15.6 Delivered.
- [ ] 15.7 Cancelled.
- [ ] 15.8 Returns.
- [ ] 15.9 Exchange.
- [ ] 15.10 RTO.
- [ ] 15.11 Refund status.

## Orders

- [ ] 15.12 All orders.
- [ ] 15.13 Order details.
- [ ] 15.14 Create order where permitted.
- [ ] 15.15 Edit order where permitted.
- [ ] 15.16 Cancel order where permitted.
- [ ] 15.17 Assign order.
- [ ] 15.18 Order status lifecycle.
- [ ] 15.19 Order activity timeline.

## Shipping

- [ ] 15.20 Create shipment.
- [ ] 15.21 Generate shipping label.
- [ ] 15.22 Bulk label generation.
- [ ] 15.23 Create manifest.
- [ ] 15.24 Bulk manifest.
- [ ] 15.25 Assign courier.
- [ ] 15.26 Track shipment.
- [ ] 15.27 Mark shipment status.
- [ ] 15.28 Shipping failure handling.

## Returns

- [ ] 15.29 Return requests.
- [ ] 15.30 Approve return.
- [ ] 15.31 Reject return.
- [ ] 15.32 Pickup status.
- [ ] 15.33 Return received.
- [ ] 15.34 Inspection.
- [ ] 15.35 Return completed.

## Exchange

- [ ] 15.36 Exchange request.
- [ ] 15.37 Approve exchange.
- [ ] 15.38 Process exchange.
- [ ] 15.39 Track replacement shipment.

## RTO

- [ ] 15.40 RTO initiated.
- [ ] 15.41 RTO tracking.
- [ ] 15.42 RTO received.
- [ ] 15.43 RTO reconciliation.

## Refunds

- [ ] 15.44 Refund request.
- [ ] 15.45 Refund approval.
- [ ] 15.46 Refund processing.
- [ ] 15.47 Refund status.

### Phase 14 Gate

- [ ] Complete order lifecycle works.
- [ ] Label creation works.
- [ ] Manifest creation works.
- [ ] Shipping integration works.
- [ ] Return lifecycle works.
- [ ] RTO lifecycle works.
- [ ] Refund permissions are enforced.
- [ ] Orders users cannot access Operations management.
- [ ] Orders users cannot access Support management.

---

# Phase 15 — Support Portal

Build `support.ruhvi.in`.

- [ ] 16.1 Support dashboard.
- [ ] 16.2 Ticket management.
- [ ] 16.3 Live chat.
- [ ] 16.4 Customer conversations.
- [ ] 16.5 Customer lookup.
- [ ] 16.6 Order lookup.
- [ ] 16.7 Return lookup.
- [ ] 16.8 Exchange lookup.
- [ ] 16.9 Refund assistance.
- [ ] 16.10 Email support.
- [ ] 16.11 Internal notes.
- [ ] 16.12 Knowledge base.
- [ ] 16.13 Canned responses.
- [ ] 16.14 Ticket assignment.
- [ ] 16.15 Ticket escalation.
- [ ] 16.16 Ticket closure.

Support users must be able to VIEW relevant order information only when permitted.

They must NOT automatically receive:

```text
orders.edit
orders.cancel
shipping.create_label
shipping.create_manifest
refunds.process
inventory.adjust
```

unless explicitly assigned.

### Phase 15 Gate

- [ ] Support can manage tickets.
- [ ] Support can look up permitted customer/order data.
- [ ] Support cannot modify restricted order data.
- [ ] Support cannot access Operations portal.
- [ ] Support cannot access Orders portal unless explicitly assigned.

---

# Phase 16 — Order Data Architecture

Use a secure structure similar to:

```text
orders/{orderId}
orders/{orderId}/items/{itemId}
orders/{orderId}/shipping/{shipmentId}
orders/{orderId}/returns/{returnId}
orders/{orderId}/events/{eventId}
orders/{orderId}/private/payment
orders/{orderId}/private/internal
```

- [ ] 15.1 Separate public/order-operational data.
- [ ] 15.2 Separate payment-sensitive data.
- [ ] 15.3 Separate internal notes.
- [ ] 15.4 Separate order events.
- [ ] 15.5 Separate shipping records.
- [ ] 15.6 Separate return records.
- [ ] 15.7 Do not rely on field hiding for Firestore document security.
- [ ] 15.8 Restrict sensitive subcollections independently.

---

# Phase 17 — Order Event Timeline

Implement:

```text
ORDER_CREATED
PAYMENT_CONFIRMED
ORDER_CONFIRMED
PACKING_STARTED
PACKED
LABEL_CREATED
MANIFEST_CREATED
SHIPPED
OUT_FOR_DELIVERY
DELIVERED
RETURN_REQUESTED
RETURN_APPROVED
RETURN_PICKED
REFUND_INITIATED
RTO_INITIATED
RTO_RECEIVED
CANCELLED
```

For every event store:

```text
eventType
performedBy
portal
timestamp
metadata
```

- [ ] 16.1 Create event model.
- [ ] 16.2 Record every important status transition.
- [ ] 16.3 Display timeline in Orders portal.
- [ ] 16.4 Restrict event creation to authorized backend actions.
- [ ] 16.5 Prevent unauthorized event manipulation.

---

# Phase 18 — Audit Logging

Create:

```text
auditLogs/{logId}
```

Fields:

```text
userId
userName
role
department
portal
action
resourceType
resourceId
before
after
timestamp
ipAddress
userAgent
```

Track at minimum:

```text
LOGIN_SUCCESS
LOGIN_FAILURE
LOGOUT
PORTAL_ACCESS_DENIED
PERMISSION_DENIED

ROLE_CHANGED
PERMISSION_CHANGED
EMPLOYEE_CREATED
EMPLOYEE_DISABLED

ORDER_CREATED
ORDER_CANCELLED
SHIPMENT_CREATED
LABEL_CREATED
MANIFEST_CREATED

REFUND_PROCESSED
PRODUCT_DELETED
PRICE_CHANGED
INVENTORY_ADJUSTED

COUPON_CREATED
PAYMENT_SETTING_CHANGED
```

- [ ] 17.1 Implement audit service.
- [ ] 17.2 Write logs server-side.
- [ ] 17.3 Prevent normal users from editing audit logs.
- [ ] 17.4 Prevent normal users from deleting audit logs.
- [ ] 17.5 Add Admin audit-log viewer.
- [ ] 17.6 Add filters.
- [ ] 17.7 Add date range.
- [ ] 17.8 Add user filter.
- [ ] 17.9 Add portal filter.
- [ ] 17.10 Add action filter.

---

# Phase 19 — Security Rules

Implement strict database rules.

Rules must verify:

```text
authenticated
active account
portal authorization
role
permission
resource ownership/access
```

- [ ] 18.1 Deny unauthenticated internal data access.
- [ ] 18.2 Deny unauthorized portal data access.
- [ ] 18.3 Deny unauthorized writes.
- [ ] 18.4 Deny unauthorized deletes.
- [ ] 18.5 Protect sensitive finance data.
- [ ] 18.6 Protect internal notes.
- [ ] 18.7 Protect employee records.
- [ ] 18.8 Protect roles.
- [ ] 18.9 Protect permissions.
- [ ] 18.10 Protect audit logs.
- [ ] 18.11 Protect payment data.
- [ ] 18.12 Protect integration secrets.

---

# Phase 20 — Backend/API Authorization

Every protected API must follow:

```text
Verify Firebase ID token
        ↓
Verify account status
        ↓
Identify current portal
        ↓
Check portal access
        ↓
Check permission
        ↓
Validate resource
        ↓
Perform operation
        ↓
Write audit log
```

- [ ] 19.1 Create reusable authentication middleware.
- [ ] 19.2 Create portal middleware.
- [ ] 19.3 Create permission middleware.
- [ ] 19.4 Create Super Admin bypass.
- [ ] 19.5 Reject client-provided roles.
- [ ] 19.6 Reject client-provided permissions.
- [ ] 19.7 Reject client-provided department escalation.
- [ ] 19.8 Return safe 401/403 errors.
- [ ] 19.9 Audit sensitive API operations.

---

# Phase 21 — Sensitive Actions

Require extra protection for:

```text
role changes
permission changes
employee disabling
large inventory adjustments
refund processing
payment settings
deleting products
deleting critical data
```

- [ ] 20.1 Identify high-risk actions.
- [ ] 20.2 Require appropriate permission.
- [ ] 20.3 Add confirmation.
- [ ] 20.4 Add re-authentication where required.
- [ ] 20.5 Add MFA for appropriate privileged users.
- [ ] 20.6 Add audit logging.
- [ ] 20.7 Add approval workflow where business policy requires it.

---

# Phase 22 — MFA and Privileged Security

Recommended minimum:

```text
SUPER_ADMIN → MFA required
ADMIN       → MFA required
MANAGER     → MFA recommended/required by policy
STAFF       → policy-based
```

- [ ] 21.1 Configure MFA.
- [ ] 21.2 Require MFA for Super Admin.
- [ ] 21.3 Require MFA for Admin.
- [ ] 21.4 Test recovery flow.
- [ ] 21.5 Audit MFA enrollment/removal.
- [ ] 21.6 Protect MFA recovery process.

---

# Phase 23 — Session Security

- [ ] 22.1 Configure session expiration.
- [ ] 22.2 Implement idle timeout where appropriate.
- [ ] 22.3 Implement logout.
- [ ] 22.4 Implement session invalidation for disabled accounts.
- [ ] 22.5 Implement re-authentication for sensitive operations.
- [ ] 22.6 Refresh authorization after role/permission changes.
- [ ] 22.7 Test old sessions after access revocation.

---

# Phase 24 — App Check / Abuse Protection

- [ ] 23.1 Evaluate Firebase App Check.
- [ ] 23.2 Configure it for appropriate Firebase services.
- [ ] 23.3 Verify compatibility with the current authentication architecture.
- [ ] 23.4 Add login rate limiting.
- [ ] 23.5 Add API rate limiting.
- [ ] 23.6 Add failed-login monitoring.
- [ ] 23.7 Add suspicious-access monitoring.

---

# Phase 25 — Secrets and Integrations

Protect:

```text
Shiprocket credentials
PhonePe credentials
Resend credentials
Brevo credentials
Zoho credentials
Meta credentials
Firebase Admin credentials
```

- [ ] 24.1 Move secrets out of frontend code.
- [ ] 24.2 Move secrets out of Git.
- [ ] 24.3 Use environment variables/secret manager.
- [ ] 24.4 Ensure Operations users cannot view secrets.
- [ ] 24.5 Ensure Orders users cannot view payment secrets.
- [ ] 24.6 Ensure Support users cannot view email/API secrets.
- [ ] 24.7 Rotate exposed credentials if discovered.

---

# Phase 26 — Domain and Deployment

Configure:

```text
ruhvi.in
auth.ruhvi.in
admin.ruhvi.in
operations.ruhvi.in
orders.ruhvi.in
support.ruhvi.in
marketing.ruhvi.in
```

- [ ] 25.1 Configure DNS.
- [ ] 25.2 Configure deployment targets.
- [ ] 25.3 Configure SSL.
- [ ] 25.4 Configure production environment variables.
- [ ] 25.5 Configure auth domains.
- [ ] 25.6 Configure OAuth redirects.
- [ ] 25.7 Verify each domain resolves correctly.
- [ ] 25.8 Verify HTTPS.
- [ ] 25.9 Verify each portal loads independently.
- [ ] 25.10 Verify no portal exposes another portal's frontend assets unnecessarily.

---

# Phase 27 — Error Handling

Create:

```text
401 Unauthorized
403 Forbidden
404 Not Found
429 Too Many Requests
500 Internal Server Error
```

Special cases:

```text
Portal access denied
Permission denied
Account disabled
Session expired
```

- [ ] 26.1 Create consistent error UI.
- [ ] 26.2 Do not leak internal authorization details.
- [ ] 26.3 Do not expose stack traces in production.
- [ ] 26.4 Log detailed errors server-side.
- [ ] 26.5 Show safe messages to users.

---

# Phase 28 — Testing Matrix

## Authentication

- [ ] Valid login works.
- [ ] Invalid login fails.
- [ ] Logout works.
- [ ] Session expiry works.
- [ ] Disabled account fails.
- [ ] MFA works for privileged users.

## Portal Access

- [ ] Operations → Operations = PASS.
- [ ] Operations → Orders = DENY.
- [ ] Operations → Support = DENY.
- [ ] Orders → Orders = PASS.
- [ ] Orders → Operations = DENY.
- [ ] Orders → Support = DENY.
- [ ] Support → Support = PASS.
- [ ] Support → Operations = DENY.
- [ ] Support → Orders = DENY.
- [ ] Super Admin → all portals = PASS.

## Admin

- [ ] Super Admin sees all modules.
- [ ] Admin sees allowed modules.
- [ ] Manager sees assigned modules only.
- [ ] Direct URL to unauthorized page fails.
- [ ] Unauthorized API request fails.
- [ ] Unauthorized database request fails.

## Operations

- [ ] Product permissions work.
- [ ] Inventory permissions work.
- [ ] CMS permissions work.
- [ ] Banner permissions work.
- [ ] Hero permissions work.
- [ ] Coupon permissions work.

## Orders

- [ ] Order creation works.
- [ ] Order editing works.
- [ ] Order cancellation permission works.
- [ ] Label generation works.
- [ ] Manifest generation works.
- [ ] Shipping works.
- [ ] Returns work.
- [ ] Exchange works.
- [ ] RTO works.
- [ ] Refund permission works.

## Support

- [ ] Ticket creation works.
- [ ] Ticket reply works.
- [ ] Ticket assignment works.
- [ ] Customer lookup works.
- [ ] Order lookup works.
- [ ] Restricted order modification fails.

---

# Phase 29 — Security Penetration-Style Tests

Attempt the following with restricted accounts:

- [ ] Manually enter another portal URL.
- [ ] Directly call another portal's API.
- [ ] Modify role in browser request.
- [ ] Modify department in browser request.
- [ ] Modify permission in browser request.
- [ ] Send another user's UID.
- [ ] Send another employee's ID.
- [ ] Attempt unauthorized Firestore read.
- [ ] Attempt unauthorized Firestore write.
- [ ] Attempt unauthorized delete.
- [ ] Replay sensitive API request.
- [ ] Use an old session after permission removal.
- [ ] Attempt access after account disablement.

Every unauthorized test must fail.

---

# Phase 30 — Firebase Emulator / Automated Rules Tests

Create automated authorization tests.

Minimum test matrix:

```text
unauthenticated → DENY
operations_staff → operations ALLOW
operations_staff → orders DENY
operations_staff → support DENY

orders_staff → orders ALLOW
orders_staff → operations DENY
orders_staff → support DENY

support_staff → support ALLOW
support_staff → operations DENY
support_staff → orders modification DENY

manager → only assigned permissions
admin → configured permissions
super_admin → ALLOW
```

- [ ] 29.1 Set up Firebase Emulator.
- [ ] 29.2 Write Security Rules tests.
- [ ] 29.3 Write authorization unit tests.
- [ ] 29.4 Write portal-access tests.
- [ ] 29.5 Write API authorization tests.
- [ ] 29.6 Run tests before production deployment.

---

# Phase 31 — Production Readiness

Before deployment:

- [ ] All previous phases completed.
- [ ] No critical security errors.
- [ ] No unauthorized portal access.
- [ ] No unauthorized API access.
- [ ] No unauthorized database access.
- [ ] All existing customer functionality still works.
- [ ] Existing login methods still work.
- [ ] Existing website still works.
- [ ] Existing light theme remains unchanged.
- [ ] All production secrets are secured.
- [ ] SSL is active on every subdomain.
- [ ] Audit logs work.
- [ ] Backups/recovery strategy exists.
- [ ] Rollback plan exists.
- [ ] Production build passes.
- [ ] Smoke tests pass.

---

# Phase 32 — Final Acceptance Test

Do not mark the project complete until these scenarios all pass.

## Scenario A — Operations Employee

```text
Login:
operations.ruhvi.in

Can:
Products
Inventory
CMS
Banners
Hero
Coupons

Cannot:
Orders
Shipping
Support
Finance
Admin User Management
```

- [ ] PASS

## Scenario B — Orders Employee

```text
Login:
orders.ruhvi.in

Can:
Orders
Shipping
Labels
Manifest
Tracking
Returns
Exchange
RTO

Cannot:
Operations management
Support management
Finance administration
User management
```

- [ ] PASS

## Scenario C — Support Employee

```text
Login:
support.ruhvi.in

Can:
Tickets
Chat
Customer lookup
Permitted order lookup
Return assistance

Cannot:
Order modification
Shipping label creation
Inventory adjustment
Operations CMS
User management
```

- [ ] PASS

## Scenario D — Operations Manager

```text
Login:
admin.ruhvi.in

Can:
Only assigned Operations modules

Cannot:
Unassigned modules
Finance
Security
User Management
Orders
Support
```

- [ ] PASS

## Scenario E — Super Admin

```text
Login:
admin.ruhvi.in

Can:
Everything
```

- [ ] PASS

---

# Phase 33 — Final Documentation

Create/update:

```text
AUTH.md
OPERATIONS.md
ORDERS.md
SUPPORT.md
PERMISSIONS.md
SECURITY.md
AUDIT-LOG.md
DEPLOYMENT.md
```

- [ ] Document authentication flow.
- [ ] Document authorization flow.
- [ ] Document roles.
- [ ] Document permissions.
- [ ] Document portal access.
- [ ] Document database security.
- [ ] Document API security.
- [ ] Document employee onboarding.
- [ ] Document employee offboarding.
- [ ] Document emergency access.
- [ ] Document deployment.
- [ ] Document rollback.
- [ ] Document testing.

---

# Completion Rule

The implementation is considered complete only when:

```text
ALL PHASES = COMPLETE
AND
ALL SECURITY TESTS = PASS
AND
ALL PORTAL ACCESS TESTS = PASS
AND
ALL EXISTING RUHVI FEATURES = STILL WORKING
AND
NO CRITICAL SECURITY ISSUE = OPEN
```

Never skip a failed checklist item.

If a phase fails:

1. Stop.
2. Identify the root cause.
3. Fix the issue.
4. Re-run the failed phase.
5. Re-run dependent tests.
6. Only then continue to the next phase.

---

# Final Architecture

```text
                    ┌─────────────────────┐
                    │   Firebase Auth      │
                    │   auth.ruhvi.in      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Authorization Layer │
                    │ Role + Department    │
                    │ Portal + Permission  │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
 admin.ruhvi.in       operations.ruhvi.in      orders.ruhvi.in
        │                      │                      │
 Admin / Managers        Products / Inventory    Orders / Shipping
 Team & Access           CMS / Marketing         Returns / RTO
        │
        ▼
 support.ruhvi.in
 Customer Support
 Tickets / Chat / Lookup

 marketing.ruhvi.in
 Campaigns / Coupons / Ads
 Email / WhatsApp / Analytics

                         +
                  Database Rules
                         +
                   API Security
                         +
                    Audit Logs
                         +
                       MFA
                         +
                  Session Security
```

## Implementation principle

**Authentication identifies the employee.  
Role identifies their job level.  
Department identifies their organizational area.  
Portal access identifies which internal application they may enter.  
Permissions identify exactly what they may do.  
Backend/database rules enforce everything.  
Audit logs record everything important.**

---

# END OF IMPLEMENTATION CHECKLIST
