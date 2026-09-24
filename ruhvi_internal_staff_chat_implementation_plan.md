# Ruhvi Internal Staff Chat — Full Implementation Plan

## 1. Project Goal

Build a fully internal, WhatsApp-like chat system inside the existing Ruhvi staff portal.

The chat system is ONLY for existing Ruhvi staff accounts. Customers must have no chat UI, no chat route access, and no ability to authenticate into the internal chat.

Use the existing Ruhvi authentication and staff-role system. Do NOT create a second authentication system.

The goal is to provide:
- 1-to-1 staff chat
- Flexible group chat
- Text messaging
- File/image attachments
- Mentions
- Order ID, support ticket ID and product references
- Message timestamps
- Notifications
- Search
- WhatsApp-like familiar UI
- Master/Super Admin access to all internal chats

Do not replace or break existing Ruhvi functionality, routes, APIs, authentication, orders, support tickets, products, or staff portal behavior.

---

## 2. Existing Authentication — MUST REUSE

Ruhvi already has staff authentication and role-based access.

Do NOT build:
- a new login page
- a separate Firebase authentication flow
- a separate staff authentication database
- a second password system

Instead:

Existing Staff Login
→ Existing Firebase Authentication
→ Existing staff/user record and role validation
→ Staff Portal
→ Internal Chat access

Only an account that is already a valid Ruhvi staff/admin account can access the chat.

Customers:
- must not see the chat icon
- must not see the chat route
- must not access chat APIs
- must not access chat database records
- must not upload chat attachments
- must not authenticate into the internal chat

The backend must enforce this. Hiding UI elements alone is NOT sufficient.

---

## 3. User Identity / Staff Profile

Each internal chat user should use the existing Ruhvi staff identity.

Store/display:
- user ID
- first name
- surname
- profile/avatar
- department
- existing staff role where needed for authorization

The normal chat UI should NOT constantly display administrative labels such as "Admin", "Support", "Operations", etc. unless relevant to the existing profile/UI.

The important identity shown in chat is the person's normal name/profile.

---

## 4. Chat Entry Point

Inside the existing staff portal, add a WhatsApp-like Chat icon.

Example:

Existing Staff Portal Header
→ Notification icon
→ Chat icon
→ User clicks Chat
→ Internal Chat interface opens

Do not redesign unrelated parts of the staff portal.

The chat feature should feel like a native part of Ruhvi's existing staff portal.

---

## 5. Chat Interface

Use a familiar WhatsApp-like structure, adapted to Ruhvi's existing UI.

### Desktop

Left side:
- conversation list
- search
- unread count
- latest message preview
- timestamp

Main area:
- chat/group header
- participant/group information
- message history
- message timestamps
- attachment previews
- text composer
- attachment button
- send button

### Mobile

Use a responsive layout:
- conversation list
- tap conversation
- full chat view
- back button
- composer fixed at bottom

Do NOT add a microphone/voice-recording button in the initial implementation.

Voice messaging is intentionally excluded from the current phase.

---

## 6. 1-to-1 Chat

Any staff user can start a direct conversation with another staff user.

Example:

Ravi ↔ Kamal

Requirements:
- send text
- receive text in real time
- timestamps
- unread count
- read status if practical
- attachment support
- message search
- user search
- conversation history

The conversation should persist.

---

## 7. Flexible Group Chat

There is NO department restriction.

Any staff user can create a group with any combination of staff members.

Examples:
- Operations + Tech + Support
- Support + Operations
- Tech + Admin
- Any other staff combination

A group is NOT required to be department-based.

### Group creation

Any regular staff user can:
1. Create a group
2. Select/add staff members
3. Set a group name/topic
4. Create the group
5. Start chatting

The person who creates the group can be treated as the group creator/manager for group-management actions.

### Group management

Support:
- add members
- remove members
- rename/edit group topic
- view members
- leave group
- delete group when the group is no longer needed

Define deletion carefully:
- "Delete for everyone" should require appropriate group-management permission and backend validation.
- If technically safer, use soft-delete/archive semantics so historical records are not accidentally destroyed.

Do NOT force department-based groups.

---

## 8. Message Types — Initial Version

Phase 1 supports:

### Text
Normal text messages.

### Attachments
Images and files.

The initial maximum attachment size should be:

**20 MB per file**

Validate this on:
- frontend
- backend/API
- upload layer

Never rely only on frontend validation.

The exact allowed file types should be configured centrally so they can be changed later without rewriting the chat system.

---

## 9. Cloudinary Attachment Flow

For chat attachments:

Staff selects/takes a file
→ frontend validates file
→ upload to Cloudinary
→ Cloudinary returns asset information
→ save attachment metadata with chat message in Supabase
→ receiver receives message in real time
→ chat renders the attachment

For an image/screenshot:

The receiver should see the actual image preview inside the chat, WhatsApp-style.

It should NOT simply show a raw Cloudinary URL as the visible message.

The URL is an implementation detail behind the attachment.

For example:

[Image Preview]
"Screenshot"

Click:
→ open full image
→ optional download

For documents:
→ show file card
→ filename
→ file type
→ size
→ open/download action

Use the user's agreed current behavior:

**Cloudinary public URL is acceptable for this internal chat implementation.**

Do NOT switch the implementation to signed URLs unless the project requirements are changed later.

---

## 10. Supabase Data

Supabase should store chat data and metadata, not large binary attachment files.

Recommended conceptual structure:

### chat_conversations
- id
- type: direct/group
- group_name/topic
- created_by
- created_at
- updated_at
- deleted_at / archived_at where appropriate

### chat_conversation_members
- conversation_id
- user_id
- joined_at
- left_at
- group-management status if required

### chat_messages
- id
- conversation_id
- sender_user_id
- message_type
- text_content
- created_at
- updated_at
- reply_to_message_id if implemented
- deleted_at if soft deletion is used

### chat_attachments
- id
- message_id
- cloudinary_public_id
- cloudinary_url
- resource_type
- file_name
- mime_type
- file_size
- width/height where applicable
- duration where applicable
- created_at

### chat_message_reads
- message_id
- user_id
- read_at

Use the existing Ruhvi user/staff table wherever possible instead of duplicating staff identity data.

---

## 11. Mentions

The chat composer should support staff mentions.

Example:

@Ravi
@Kamal

When typing "@", show available staff users.

Mentioned users should receive an appropriate notification.

Store mentions structurally rather than relying only on plain text.

Recommended conceptual table:

### chat_message_mentions
- message_id
- mentioned_user_id
- created_at

This makes future notification/search functionality much easier.

---

## 12. Ruhvi Entity Mentions / References

The chat must support references to existing Ruhvi entities.

### Order

Example:
"@Ravi please check order RUH12345"

The Order ID should become clickable.

Click:
→ open the relevant Ruhvi order details.

### Support Ticket

Example:
"Please check ticket TKT5678"

Ticket reference becomes clickable.

Click:
→ open the relevant support ticket.

### Product

Example:
"Please check this product."

Product reference becomes clickable.

Click:
→ open the relevant product details.

Do NOT duplicate full order/ticket/product records inside chat.

Store only the necessary reference:
- entity type
- entity ID
- optional display label

Resolve the latest entity information from the existing Ruhvi system when the user opens the reference.

---

## 13. Notifications

Ruhvi already has a notification system.

Integrate chat notifications into the existing notification architecture where practical.

Possible notifications:
- new direct message
- new group message
- @mention
- added to group
- removed from group
- group renamed
- relevant chat activity

Do NOT create an unrelated duplicate notification system if the existing one can be reused.

Unread chat count should be visible on the Chat icon.

---

## 14. Real-Time Messaging

Messages should appear without requiring manual page refresh.

Use the existing Ruhvi/Supabase real-time capabilities where appropriate.

Expected behavior:

Ravi sends message
→ database receives message
→ realtime event
→ Kamal's chat updates immediately
→ unread count updates
→ notification updates when applicable

Handle:
- reconnects
- duplicate events
- failed sends
- optimistic UI carefully
- message ordering

Do not lose messages during temporary network failures.

---

## 15. Search

Provide practical internal chat search.

Search should eventually support:
- staff name
- group name
- message text
- Order ID
- Ticket ID
- Product reference

Start with a simple, reliable search implementation rather than an unnecessarily complex search engine.

---

## 16. Admin / Master Admin Oversight

This is a REQUIRED requirement.

Ruhvi has an existing Master Admin / Super Admin role.

Only that existing Master/Super Admin role should have global chat-management access.

Do NOT create a new admin role.

### Master Admin capabilities

Master Admin can access:

**Chat Management / All Chats**

From there the Master Admin can view:
- all direct conversations
- all group conversations
- participants
- complete message history
- timestamps
- attachments
- Order/Ticket/Product references
- search/filter information

The Master Admin should be able to locate conversations by:
- staff user
- group
- date
- Order ID
- Ticket ID
- Product
- message content

### Staff visibility

Normal staff users should use the chat normally.

Do not expose an administrative chat-management interface to ordinary staff.

Do not expose customer access.

### Backend security

This MUST be enforced server-side.

Never implement this as:

"If admin, show the button."

Instead enforce:

Existing authenticated user
→ verify existing Ruhvi role
→ if Master/Super Admin
→ authorize global chat-management API/data access

Ordinary staff:
→ only conversations they are members of
→ only messages they are authorized to access

Customers:
→ no chat access at all

---

## 17. Admin Audit Log

For security and accountability, record administrative actions such as:
- Master Admin opened global chat-management view
- searched chats
- viewed a conversation
- accessed an attachment
- deleted/archived a chat
- performed moderation action

Do NOT log sensitive message content unnecessarily in the audit table.

Recommended:

### chat_admin_audit_logs
- id
- admin_user_id
- action
- conversation_id
- target_message_id where relevant
- created_at
- metadata JSON where necessary

---

## 18. Security Rules

Security must be implemented at multiple levels.

### Frontend
Hide chat from customers.

### Backend/API
Reject unauthorized chat requests.

### Database
Use proper Row Level Security / authorization policies.

### Storage
Chat attachment upload must require authenticated staff access.

### Entity access
Opening an Order/Ticket/Product reference must still respect the user's existing Ruhvi permissions.

Never assume that because a user can see a chat message, they automatically have unrestricted access to every linked business record.

---

## 19. Deletion Strategy

Avoid permanent deletion as the default for business communication.

Recommended:
- message soft-delete
- group archive/delete semantics
- attachment cleanup only when safe
- preserve necessary audit/history data

If a group is "deleted" from the UI, decide whether this means:
1. hidden/archived from normal users, or
2. permanently destroyed

Prefer archive/soft-delete unless there is a clear business requirement for permanent destruction.

---

## 20. Voice Messaging — NOT IN CURRENT VERSION

Do NOT add microphone/voice recording in the first implementation.

The earlier idea was:
Record → Cloudinary → message → voice bubble

But the current confirmed scope intentionally excludes the microphone button because continuous voice recordings would increase Cloudinary storage usage.

Voice messaging can be added later as a separate phase.

---

## 21. Attachment Retention

Current agreed architecture:

- Cloudinary stores the actual attachment
- Supabase stores attachment metadata
- public Cloudinary URL is used
- maximum file size: 20 MB per file

Do NOT introduce automatic deletion/expiration unless a concrete retention policy is defined.

Do NOT assume Cloudinary will automatically delete chat files after a certain number of days.

If storage cleanup is needed later, implement an explicit Ruhvi-controlled retention/cleanup process.

---

## 22. UI/UX Principles

The chat should feel familiar like WhatsApp, but it must remain visually consistent with Ruhvi.

Priorities:
- fast
- clean
- familiar
- responsive
- easy for non-technical staff
- minimal clicks
- readable message history
- obvious unread state
- clear attachment previews

Do not copy WhatsApp branding or assets.

Do not redesign unrelated Ruhvi pages.

Do not remove existing buttons/routes/features.

---

## 23. Suggested Implementation Phases

### Phase 1 — Foundation
- database schema
- staff authorization
- chat icon
- chat route/page
- conversation list
- direct chat
- group creation
- group members
- text messages
- timestamps
- realtime updates

### Phase 2 — Attachments
- attachment button
- 20 MB validation
- Cloudinary upload
- Supabase attachment metadata
- image preview
- document/file card
- open/download

### Phase 3 — Mentions & Ruhvi References
- @staff mentions
- mention notifications
- Order ID references
- Ticket references
- Product references
- clickable deep links

### Phase 4 — Notifications & Search
- unread counts
- existing notification integration
- message search
- user/group search
- Order/Ticket/Product search

### Phase 5 — Master Admin
- Chat Management
- All Chats
- global search
- conversation inspection
- attachment inspection
- admin audit log

### Phase 6 — Hardening
- RLS/security testing
- customer access testing
- staff permission testing
- Master Admin testing
- upload failure handling
- realtime reconnect testing
- mobile responsiveness
- performance testing

### Phase 7 — Optional Future Features
Only after the core system is stable:
- voice messages
- audio transcription
- message reply
- message forwarding
- reactions
- pinned messages
- advanced moderation
- retention automation

---

## 24. Critical Rules for Antigravity

Before changing code:

1. Inspect the existing Ruhvi architecture.
2. Identify the current Firebase authentication implementation.
3. Identify the existing staff/user role source.
4. Identify existing Supabase tables and RLS policies.
5. Identify the existing notification system.
6. Identify existing order, support-ticket and product routes/APIs.
7. Identify the existing Cloudinary configuration.
8. Do NOT duplicate functionality that already exists.

Before implementation, produce a short architecture impact report.

Then implement incrementally.

After every major phase:
- run build
- run lint/type checks if available
- test existing staff login
- test customer login
- test existing order/support/product functionality
- test the new chat functionality

Never remove or break existing features just to make the chat work.

---

## 25. Acceptance Criteria

The implementation is considered successful only when all of these work:

### Access
- valid staff can access chat
- invalid/non-staff users cannot access chat
- customers cannot see or access chat
- Master/Super Admin has global chat-management access

### Direct Chat
- staff can start 1-to-1 conversations
- messages send and receive in real time
- timestamps appear
- history persists

### Groups
- any staff user can create a group
- any staff combination is allowed
- no department restriction
- group topic/name can be set
- members can be added/removed according to group permissions
- group can be left
- group can be archived/deleted according to defined rules

### Attachments
- file attachment works
- maximum size is 20 MB
- Cloudinary stores the file
- Supabase stores metadata
- image displays as an image preview
- files display as file cards
- public Cloudinary URL is used internally
- no raw URL is unnecessarily exposed as the primary chat UI

### Mentions
- @staff mention works
- mentioned user can receive notification
- Order ID can be referenced
- Ticket ID can be referenced
- Product can be referenced
- references are clickable

### Admin
- Master/Super Admin can see all chats
- ordinary staff cannot access global chat management
- admin access is backend-enforced
- admin actions are auditable

### Stability
- existing Ruhvi authentication continues working
- existing customer portal continues working
- existing staff portal continues working
- existing orders/support/products continue working
- no existing route/API/button is removed
- responsive UI works on desktop and mobile

---

## 26. Important Instruction

This document is the implementation specification.

Do not start by blindly generating large amounts of code.

First inspect the existing Ruhvi project and map the current architecture.

If any requirement conflicts with existing code, STOP and explain the conflict before making destructive changes.

Preserve existing functionality.

Implement the chat system as an additive internal staff feature.
