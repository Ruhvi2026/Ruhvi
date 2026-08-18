# Ruhvi AI-First Customer Support & Ticket System
## Implementation Specification — V1

**Project:** Ruhvi  
**Primary domain:** ruhvi.in  
**Customer support console:** support.ruhvi.in  
**Document purpose:** Executable implementation blueprint for the first production-ready version of Ruhvi's AI-first customer support and ticket-resolution system.

---

## 1. Product Goal

Build an **AI-first customer support system** where customers do **not** start by filling out a traditional ticket form.

The intended journey is:

**Customer issue → AI conversation → AI attempts resolution → if unresolved, AI creates a ticket → ticket is linked to the correct order/product → customer receives confirmation → support executive resolves it from support.ruhvi.in → customer receives updates → admin dashboard receives real-time analytics.**

The system must support **all customer issues**, not only order/product problems.

Examples include:

- Damaged product
- Missing product/item
- Wrong product received
- Product quality issue
- Warranty claim
- Return request
- Exchange request
- Refund issue
- Payment issue
- Wallet balance deducted incorrectly
- Coupon/reward issue
- Order issue
- Delivery issue
- Account/login issue
- Profile/account problem
- Website/app problem
- Security-related support issue
- Any other issue

If the AI cannot confidently map an issue to an existing category, it must use **Other Issue** rather than blocking ticket creation.

---

# 2. Core Architecture

Use three clearly separated experiences:

### A. Customer Support Experience
Integrated into the main Ruhvi website/app.

Customer sees:

- Help / Customer Care entry point
- AI support conversation
- Conversation history
- Ticket status when a ticket is created
- Ticket details
- Ticket timeline
- Customer replies
- Attachments
- Resolution information

**Do NOT expose a traditional ticket form as the primary entry point.**

The customer should first interact with AI.

---

### B. Support Executive Console

**Domain:** `support.ruhvi.in`

This is a dedicated support operations application.

Only authorized customer-care/support staff should be able to access it.

It must contain:

- Support dashboard
- Ticket queue
- Ticket details
- Customer information
- Order information
- Product information
- Delivery information
- Payment/refund information where relevant
- AI conversation summary
- Original AI/customer conversation context
- Attachments
- Ticket timeline
- Internal notes
- Customer replies
- Status controls
- Priority controls
- Assignment controls
- Resolution controls

The support console must be optimized for fast ticket resolution rather than general administration.

---

### C. Main Admin Dashboard

Keep the existing admin panel separate.

Add a dedicated:

**Support Analytics** tab/module.

The admin dashboard should provide high-level operational visibility without requiring the owner to open individual tickets.

It should show:

- Total tickets
- New tickets
- Open tickets
- Pending tickets
- Resolved tickets
- Closed tickets
- Overdue/SLA-breached tickets
- Average first-response time
- Average resolution time
- Resolution rate
- AI resolution/deflection rate
- Tickets by category
- Tickets by priority
- Tickets by status
- Tickets by support executive
- Daily/weekly/monthly trends

The analytics should update automatically from the ticket system.

---

# 3. AI-First Customer Flow

## Step 1 — Customer Opens Help

Customer clicks:

- Help
- Customer Care
- Need Help
- Support

The system opens the AI support interface.

---

## Step 2 — AI Understands the Issue

AI should allow natural-language conversation.

Example:

> "My necklace arrived broken."

AI should understand:

- Issue type
- Potential category
- Related order
- Product
- Relevant dates
- Customer intent
- Required next action

Do not force the customer to understand internal support categories.

---

## Step 3 — AI Attempts Resolution

AI should first try to resolve the issue using:

- Approved knowledge base
- Ruhvi support policies
- Order data
- Product data
- Delivery information
- Customer account information
- Warranty rules
- Return/exchange rules
- Payment/wallet information where permitted

The AI should not invent policies, refunds, warranty decisions, or account actions.

When a backend action requires authorization, the AI should request/trigger the appropriate controlled workflow instead of pretending that the action happened.

---

# 4. AI Resolution vs Ticket Creation

AI should resolve simple, well-defined issues without creating a ticket when possible.

Examples:

- "Where is my order?"
- "What is your return policy?"
- "How long does delivery take?"
- "How do I use my wallet balance?"
- "How do I track my order?"

If the issue requires human intervention, evidence review, approval, investigation, or cannot be confidently resolved, AI should create a ticket.

Examples:

- Damaged product
- Missing item
- Warranty claim
- Incorrect product
- Refund discrepancy
- Wallet deduction dispute
- Account problem requiring investigation
- Payment dispute
- Technical issue that cannot be resolved
- Any issue outside the AI's trusted knowledge/action scope

---

# 5. Ticket Creation Trigger

When AI determines that human support is required, it should clearly tell the customer that a support ticket will be created.

Example:

> "I couldn't resolve this completely. I'll create a support ticket for you so our customer-care team can investigate it."

Before creation, AI should collect only missing information that is actually necessary.

Do not repeatedly ask for information already available in the conversation or account/order data.

---

# 6. Automatic Ticket Data Collection

When creating a ticket, automatically attach as much trusted information as possible.

## Customer data

- Customer ID
- Name
- Email
- Phone number
- Account creation information where useful
- Customer's preferred communication channel if available

Do not duplicate sensitive information unnecessarily.

---

## Order data

If the issue is order-related:

- Order ID
- Order date
- Order status
- Payment status
- Total order amount
- Delivery address/reference required for support
- Shipping provider
- Tracking information
- Shipment date
- Delivery date
- Relevant order events

The system should retrieve these directly from the database instead of asking the customer to manually type them whenever possible.

---

## Product data

For product-related tickets:

- Product ID
- Product name
- SKU
- Variant
- Quantity
- Purchase price
- Product images where applicable
- Warranty eligibility/status
- Order-product relationship

---

## Issue data

Store:

- Ticket ID
- Category
- Subcategory
- Issue title
- Customer's original description
- AI-generated structured summary
- AI confidence where useful
- Priority
- Severity
- Creation timestamp
- Source/channel
- Related order ID
- Related product ID
- Current status
- Assigned executive

---

# 7. Ticket Categories — V1

Start with a practical category structure.

### Orders & Delivery
- Order issue
- Delivery delay
- Delivery failed
- Wrong delivery status
- Wrong/missing item
- Other order issue

### Product
- Damaged product
- Defective/product quality issue
- Wrong product received
- Missing item
- Product information
- Other product issue

### Warranty
- Warranty claim
- Warranty status
- Warranty eligibility
- Other warranty issue

### Return & Exchange
- Return request
- Exchange request
- Return status
- Exchange status
- Other return/exchange issue

### Payments & Refunds
- Payment issue
- Refund issue
- Refund not received
- Payment deducted but order failed
- Wallet balance issue
- Wallet deduction dispute
- Other payment issue

### Account & Security
- Cannot log in
- Account access issue
- Profile/account issue
- OTP issue
- Security concern
- Other account issue

### Rewards & Promotions
- Coupon issue
- Reward issue
- Offer issue
- Other rewards issue

### Technical
- Website problem
- App problem
- Feature not working
- Error/bug
- Other technical issue

### Other
- Other Issue

The category system must remain configurable so new categories can be added later without restructuring the database.

---

# 8. Attachments

Customers must be able to attach evidence when required.

Examples:

- Product photos
- Damaged-product photos
- Packaging photos
- Screenshots
- Payment screenshots
- Error screenshots
- Other supporting documents

Requirements:

- Multiple attachments
- Image preview
- Upload progress
- File type validation
- File size validation
- Secure storage
- Attachment metadata
- Ability for support executives to view/download where authorized

Do not allow unsafe file types.

---

# 9. Ticket Status Lifecycle

Use a simple V1 lifecycle:

**New → Open → In Progress → Waiting for Customer → Resolved → Closed**

Additional internal/system state:

**SLA Breached**

A ticket should not be marked Resolved unless the support executive has entered an appropriate resolution/action.

Customer should be able to see meaningful statuses without exposing unnecessary internal terminology.

---

# 10. Priority

V1 priority:

- Low
- Normal
- High
- Urgent

AI may suggest priority based on the issue, but support staff must be able to override it.

Examples:

- Minor information request → Low/Normal
- Damaged product → Normal/High
- Payment/wallet discrepancy → High
- Account/security concern → High/Urgent
- Severe order/customer-impacting issue → High/Urgent

Do not let AI make irreversible business decisions solely from priority.

---

# 11. Support Executive Console

Create `support.ruhvi.in`.

## Authentication

Only authorized support staff can access it.

Implement:

- Secure login
- Role-based access
- Session management
- Logout
- Unauthorized-access protection
- Audit logging

Suggested roles for future scalability:

- Support Executive
- Senior Support Executive
- Support Manager
- Support Admin

V1 may start with Support Executive + Admin/Manager permissions.

---

# 12. Support Dashboard

The support homepage should show:

- New tickets
- My assigned tickets
- Unassigned tickets
- High-priority tickets
- Urgent tickets
- Waiting for customer
- SLA-at-risk tickets
- Overdue tickets
- Recently resolved tickets

Include:

- Search
- Filters
- Sorting
- Pagination/infinite loading
- Category filter
- Priority filter
- Status filter
- Assignee filter
- Date filter

---

# 13. Ticket Detail Screen

This is the most important screen.

Use a clear support-agent layout.

## Header

Show:

- Ticket ID
- Status
- Priority
- Category
- Created date/time
- Assigned executive
- SLA status

---

## Customer Panel

Show:

- Customer name
- Customer ID
- Email
- Phone
- Account summary
- Relevant previous tickets

---

## Order Panel

When applicable:

- Order ID
- Order status
- Order date
- Payment status
- Delivery status
- Shipment tracking
- Delivery date
- Products

The executive should not need to open another system/page to understand the case.

---

## Product Panel

Show:

- Product image
- Product name
- SKU
- Quantity
- Purchase information
- Warranty status
- Relevant product/order information

---

## Issue Panel

Show:

- Customer's original issue
- AI-generated summary
- Category
- Subcategory
- Priority
- Timeline
- Attachments

---

## Conversation/Timeline

Display chronologically:

- AI conversation summary
- Customer messages
- Support replies
- Status changes
- Assignment changes
- Internal notes
- Attachment events
- System events

Clearly distinguish internal notes from customer-visible replies.

---

# 14. Internal Notes

Support executives should be able to add internal notes.

Internal notes must:

- Never be visible to customers
- Show author
- Show timestamp
- Be included in audit history

Examples:

> "Waiting for warehouse confirmation."

> "Customer approved exchange."

---

# 15. Customer Reply

Support executives must be able to reply to the customer from the ticket.

A reply should:

1. Be saved to the ticket.
2. Appear in the customer support interface.
3. Trigger the appropriate customer notification.
4. Update the ticket timeline.
5. Preserve the complete conversation history.

Email notification should also be triggered where appropriate.

---

# 16. Email Notifications

When a ticket is created:

**Customer receives ticket confirmation email.**

Email should contain:

- Ticket ID
- Issue summary
- Current status
- Expected next step
- Link to view ticket/support
- Support contact information

When support replies:

**Customer receives a notification email.**

When status changes:

Send notifications for meaningful customer-facing changes.

Avoid sending unnecessary emails for internal changes.

Use the existing transactional email infrastructure rather than creating a new email provider specifically for support.

---

# 17. Customer Ticket View

Even though ticket creation is AI-first, customers need a way to track an existing ticket.

Customer should be able to view:

- Ticket ID
- Issue
- Current status
- Category
- Created date
- Last updated
- Timeline
- Support replies
- Attachments
- Resolution
- Ability to reply
- Ability to add requested evidence

The customer should not need to create a second ticket for an existing case.

---

# 18. AI Context Preservation

When AI creates a ticket, preserve the relevant AI conversation context.

Store:

- Conversation ID
- Relevant conversation messages
- AI summary
- Extracted issue
- Extracted entities
- AI decision/reason
- Missing-information questions
- Customer answers

The support executive should be able to understand how the issue reached ticket creation without forcing the customer to repeat everything.

---

# 19. AI Usage Rules

Use the existing Ruhvi AI Controller.

Do **not** create a separate support-specific AI controller unless technically required later.

The support system should call the existing AI routing/control layer.

AI can be used for:

- Issue understanding
- Intent/category detection
- Knowledge-base answers
- Resolution suggestions
- Ticket creation decision
- Structured ticket summary
- Priority suggestion
- Duplicate-ticket detection
- Support-agent summary
- Suggested reply
- Conversation summarization

AI should NOT independently:

- Approve refunds without authorization
- Promise compensation
- Change wallet balances
- Modify orders without permission
- Approve warranty claims without required validation
- Make irreversible account changes
- Invent policy

Use controlled backend actions/tools for these operations.

---

# 20. AI Cost Strategy

The system is AI-first, but it should not waste AI calls.

Reuse existing context when possible.

Avoid unnecessary repeated calls.

Examples:

- Do not call AI to retrieve a simple order status if a deterministic database lookup can answer it.
- Do not call AI for every status update.
- Do not call AI every time a support executive sends a normal reply.
- Use AI where natural-language understanding or reasoning adds real value.

The existing admin AI Controller remains the central place for AI configuration, routing, quotas and model management.

---

# 21. Admin Analytics

Add:

**Admin → Support Analytics**

V1 metrics:

### Ticket volume
- Total tickets
- Tickets today
- Tickets this week
- Tickets this month

### Status
- New
- Open
- In Progress
- Waiting for Customer
- Resolved
- Closed
- SLA breached

### Performance
- Average first response time
- Average resolution time
- Resolution rate
- Reopen rate

### AI
- AI conversations
- AI-resolved conversations
- Tickets created by AI
- AI deflection/resolution rate
- AI-to-human escalation rate

### Categories
- Orders
- Delivery
- Product
- Warranty
- Returns
- Payments
- Wallet
- Account
- Technical
- Other

### Team
- Tickets per executive
- Open tickets per executive
- Resolved tickets per executive
- Average resolution time per executive

Charts should support daily/weekly/monthly ranges.

---

# 22. Real-Time Updates

The system should update important operational data without requiring manual page refresh.

At minimum:

- New ticket appears in support queue
- Ticket status changes
- Assignment changes
- New customer reply
- New support reply
- SLA state changes
- Dashboard ticket counters

Use the project's existing realtime/database capabilities where available.

---

# 23. SLA Foundation

Do not over-engineer SLA in V1.

Create the data model so SLA rules can be expanded later.

At minimum track:

- Ticket created time
- First response time
- Resolution time
- SLA due time
- SLA breached flag
- Resolved time

The exact SLA policy should remain configurable later.

---

# 24. Audit Log

Every important support action should be auditable.

Track:

- Ticket created
- Category changed
- Priority changed
- Assignment changed
- Status changed
- Internal note added
- Customer reply
- Support reply
- Attachment added
- Ticket resolved
- Ticket reopened
- Administrative changes

Include:

- Actor
- Actor role
- Timestamp
- Action
- Previous value where applicable
- New value where applicable

---

# 25. Security Requirements

Follow least-privilege access.

Customer must only see their own tickets.

Support executives should only see tickets permitted by their role.

Admin/manager access should be configurable.

Protect:

- Customer personal data
- Order data
- Payment-related information
- Internal notes
- Support audit logs
- Attachments

Never expose internal notes or internal AI instructions to customers.

Do not expose secrets or API keys to the frontend.

Validate all authorization server-side.

---

# 26. Data Model — V1

Design database entities around:

### `support_tickets`

Suggested fields:

- id
- ticket_number
- customer_id
- order_id
- product_id
- category
- subcategory
- title
- description
- ai_summary
- priority
- status
- source
- assigned_to
- created_at
- updated_at
- first_response_at
- resolved_at
- closed_at
- sla_due_at
- sla_breached
- ai_created
- ai_conversation_id

---

### `support_messages`

- id
- ticket_id
- sender_type
- sender_id
- message
- visibility
- created_at

`visibility`:

- customer
- internal

---

### `support_attachments`

- id
- ticket_id
- message_id
- uploaded_by
- file_name
- file_type
- storage_path
- file_size
- created_at

---

### `support_assignments`

- id
- ticket_id
- assigned_to
- assigned_by
- assigned_at
- unassigned_at

---

### `support_audit_logs`

- id
- ticket_id
- actor_id
- actor_type
- action
- old_value
- new_value
- created_at

---

### `support_categories`

Make categories database/config driven rather than hardcoded wherever practical.

---

# 27. Ticket Number

Generate a human-friendly unique ticket number.

Example:

`RUV-2026-000001`

Do not use the database UUID as the customer-facing ticket number.

UUID/internal ID can still be used internally.

---

# 28. Duplicate Ticket Protection

Before creating a new ticket, AI/system should check for an existing relevant open ticket.

If a customer already has an open ticket for the same issue/order:

- Inform the customer
- Show the existing ticket
- Continue the existing case when appropriate
- Avoid unnecessary duplicate tickets

Do not automatically merge unrelated issues.

---

# 29. "Other Issue" Safety Net

This is mandatory.

If the AI cannot confidently classify an issue:

- Category = Other
- Preserve customer's exact description
- Preserve AI summary
- Attach relevant order/product context
- Create the ticket
- Route it to the general support queue

No issue should be rejected merely because it does not fit the predefined categories.

---

# 30. V1 Scope — Build First

Implement only the core route first:

### Customer
- Help entry
- AI support chat
- AI resolution attempt
- Ticket escalation
- Automatic order/product context
- Attachment upload
- Ticket creation
- Ticket tracking
- Customer notifications

### Support
- support.ruhvi.in
- Authentication
- Ticket queue
- Ticket detail
- Customer/order/product context
- Timeline
- Internal notes
- Customer reply
- Status
- Priority
- Assignment
- Resolution

### Admin
- Support Analytics tab
- Ticket metrics
- Status metrics
- Category metrics
- Team metrics
- AI escalation/deflection metrics

### System
- Database
- Secure storage
- Email notifications
- Audit logs
- Real-time updates
- Existing AI Controller integration

---

# 31. Explicitly Do NOT Build in V1

Avoid scope creep.

Do not initially build:

- WhatsApp support
- Social media support
- Voice support
- Complex chatbot personalities
- Advanced AI agent autonomy
- Automatic refunds
- Automatic warranty approval
- Complex SLA rule engine
- Advanced workforce scheduling
- Complex omnichannel inbox
- Customer-facing manual ticket form
- Large knowledge-management platform
- Advanced AI analytics

Prepare architecture for these later, but do not block V1 on them.

---

# 32. Recommended Implementation Order

## Phase 1 — Database/Foundation

Build:

1. Ticket tables
2. Message tables
3. Attachment tables
4. Assignment tables
5. Audit logs
6. Categories
7. Ticket number generation
8. Permission model

Do not build UI before the data model is stable.

---

## Phase 2 — Customer AI Support

Build:

1. Help entry
2. AI conversation
3. Knowledge/context retrieval
4. Resolution attempt
5. Escalation decision
6. Ticket creation
7. Automatic order/product linking
8. Attachment upload
9. Customer confirmation

---

## Phase 3 — Support Console

Build:

1. support.ruhvi.in
2. Authentication
3. Queue
4. Filters
5. Ticket detail
6. Customer context
7. Order context
8. Product context
9. Timeline
10. Internal notes
11. Customer reply
12. Status/priority/assignment
13. Resolve/close

---

## Phase 4 — Notifications

Implement:

1. Ticket created email
2. Support reply email
3. Important status-change emails
4. In-app/web notification
5. Customer ticket timeline

Use the existing transactional email infrastructure.

---

## Phase 5 — Admin Analytics

Add:

1. Support Analytics tab
2. Ticket counts
3. Status charts
4. Category charts
5. Resolution metrics
6. SLA metrics
7. Team performance
8. AI metrics

---

## Phase 6 — QA & Production Hardening

Test:

- Customer permissions
- Support permissions
- Admin permissions
- Ticket creation
- Ticket duplication
- Attachments
- Email delivery
- Real-time updates
- AI escalation
- Order linking
- Warranty cases
- Wallet cases
- Account cases
- Other Issue
- SLA tracking
- Audit logging
- Mobile responsiveness
- Error handling
- Empty states
- Loading states
- Network failures

---

# 33. Acceptance Criteria

V1 is considered complete when this scenario works end-to-end:

### Example

Customer says:

> "My necklace arrived broken."

AI:

1. Understands the issue.
2. Identifies the relevant order.
3. Identifies the product.
4. Checks available policy/warranty context.
5. Attempts resolution.
6. Determines human support is required.
7. Collects missing information only if necessary.
8. Allows customer to upload photos.
9. Creates a unique ticket.
10. Automatically attaches customer/order/product/delivery information.
11. Stores the relevant AI conversation context.
12. Sends customer a confirmation email.

Support executive:

13. Logs into `support.ruhvi.in`.
14. Sees the new ticket.
15. Opens it.
16. Immediately sees the complete case context.
17. Reviews photos and conversation.
18. Adds internal notes if required.
19. Replies to customer.
20. Changes status.
21. Resolves the issue.
22. Customer receives the appropriate notification.

Admin:

23. Opens Admin → Support Analytics.
24. Sees the ticket in real-time.
25. Sees its category/status/priority.
26. Sees the resolution metrics update after resolution.

If this flow works reliably, V1's core architecture is successful.

---

# 34. Engineering Principles

1. **AI-first, not AI-everywhere.**
2. **Do not make customers repeat information already available.**
3. **Every ticket must have complete context.**
4. **Human support remains the final authority for sensitive/irreversible actions.**
5. **Do not expose internal information to customers.**
6. **Keep support operations separate from the main admin UI.**
7. **Keep analytics in the main admin dashboard.**
8. **Use the existing AI Controller.**
9. **Use existing authentication, database, storage and email infrastructure where appropriate.**
10. **Build V1 as a clean foundation for future expansion.**
11. **Avoid unnecessary dependencies.**
12. **Do not break existing Ruhvi functionality.**

---

# 35. Final User Journey

The intended V1 architecture is:

**Ruhvi customer**

↓  

**Help / Customer Care**

↓

**AI Support**

↓

**Can AI resolve?**

### YES
→ Resolve through approved information/actions  
→ No ticket required

### NO
→ AI creates ticket

↓

**Ticket automatically enriched**

- Customer
- Order
- Product
- Delivery
- Payment/relevant context
- Issue
- AI summary
- Conversation
- Attachments
- Priority
- Category

↓

**Customer receives confirmation**

↓

**support.ruhvi.in**

↓

**Support Executive resolves ticket**

↓

**Customer receives updates**

↓

**Admin Dashboard → Support Analytics**

↓

**Owner monitors the complete operation**

---

# 36. Future Expansion Path

After V1 is stable, consider adding branches one at a time:

1. AI agent-assist
2. Advanced knowledge base
3. Automated FAQ resolution
4. SLA automation
5. CSAT
6. Customer satisfaction analytics
7. WhatsApp support
8. Email-to-ticket
9. Omnichannel support
10. Advanced AI workflow automation
11. Automated low-risk actions
12. Advanced fraud/security workflows

Do not implement these before the V1 route is stable.

---

# Developer Instruction

Implement this document as a production-quality V1.

Before changing existing Ruhvi code:

1. Inspect the existing architecture.
2. Identify current authentication.
3. Identify database/schema.
4. Identify storage.
5. Identify email/notification infrastructure.
6. Identify existing AI Controller.
7. Identify existing admin dashboard.
8. Identify existing customer/order/product models.
9. Reuse existing infrastructure where appropriate.
10. Avoid duplicate systems.

Do not blindly create new services if the existing project already provides the required capability.

Preserve existing functionality.

If an existing implementation conflicts with this specification, prefer the smallest safe change that achieves the required V1 behavior and document the conflict.

Build in small, testable phases.

Do not mark a feature complete until its end-to-end flow has been tested.

# End of V1 Specification
