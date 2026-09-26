TASK: Build a Separate Staff Task Manager Module

You are working on the existing Ruhvi Jewels web application.

Build a complete Staff Task Manager module as a separate module from the existing Staff Messenger.

1. CRITICAL RULE — DO NOT BREAK EXISTING SYSTEM

Before writing or modifying code:

1. Audit the existing codebase.
2. Understand the current:
   - Authentication
   - Staff roles and hierarchy
   - Departments
   - Manager relationships
   - Firebase Auth
   - Supabase database
   - Existing API routes
   - Existing middleware/JWT flow
   - Staff Messenger
   - Existing notification system
   - Existing Cloudinary integrations
   - Existing order/product/support modules
   - Existing UI/navigation structure
3. Reuse existing infrastructure wherever appropriate.
4. Do NOT duplicate existing authentication, role systems, notification systems, or storage integrations unnecessarily.

Absolutely DO NOT:

- Break existing website functionality.
- Break Staff Messenger.
- Remove existing buttons.
- Remove existing routes.
- Remove existing APIs.
- Change existing authentication behaviour unnecessarily.
- Change existing database behaviour unnecessarily.
- Replace working functionality with a new implementation without a strong technical reason.
- Create a third Cloudinary account.
- Use the Primary Website Cloudinary account for Task Manager attachments.

Existing functionality must continue working exactly as before.

---

2. TASK MANAGER MUST BE A SEPARATE MODULE

Task Manager is a dedicated staff-only work-management system.

It must NOT be merged into Staff Messenger.

Messenger and Task Manager can reuse common infrastructure such as:

- Staff authentication
- Staff roles
- Department hierarchy
- Notifications
- Existing Secondary Cloudinary configuration

But their business logic, UI and data models must remain properly separated.

---

3. CORE DESIGN PHILOSOPHY

Use:

«Simple by default. Flexible when needed.»

Basic task creation must remain extremely simple.

Do not force staff to configure advanced options every time they create a task.

Basic task creation should require only essential information.

Advanced functionality must be placed behind:

Advanced Options

Optional automation should be placed in a separate:

Automation

section.

A staff member should be able to create a normal task without touching advanced settings.

---

4. TASK CREATION — BASIC FIELDS

Create a clean task creation interface.

Basic fields:

- Task ID — automatically generated
- Task Title — required
- Description — required
- Created By — automatically detected from logged-in staff
- Assignment — required
- Priority — required
- Start Time
- Expected Duration
- Due Date / Due Time
- Status
- Optional related context
- Optional attachments

Do not make unnecessary advanced fields mandatory.

---

5. TASK ASSIGNMENT SYSTEM

The assignment system must support both:

A. Direct Staff Assignment

Any authorized staff member can assign a task directly to another staff member.

Example:

Orders Staff → Operations Staff

This should go directly to the selected Operations staff member.

It must NOT automatically pass through the Operations Manager.

---

B. Department Assignment

A task can also be assigned to a department.

Example:

Orders → Operations Department

When a task is assigned to a department:

1. Identify the Manager of that department.
2. Route the task to that Manager.
3. Manager can:
   - Accept/keep the task
   - Assign it to a staff member
   - Reassign it where permitted

---

C. Manager Assignment

Department Managers can assign/reassign tasks to staff members under their department.

---

D. Cross-Department Assignment

The system must support staff from different departments working together.

Do not artificially restrict task assignment only to the creator's department.

---

6. SUPPORTING MEMBERS

A task can optionally have:

Supporting Members

These are staff members actively helping with the task.

Supporting Members can belong to:

- Same department
- Different department

They should be able to see and participate in the task according to their permissions.

---

7. SPECTATORS

Create a separate role called:

Spectator

A Spectator can:

- View the task
- View task progress
- View activity
- View relevant updates

But a Spectator is NOT an Assignee.

A Spectator should not automatically become responsible for completing the task.

Example:

Orders staff creates a task for Operations.

Orders Manager can optionally be added as a Spectator to monitor progress.

---

8. PRIORITY SYSTEM

Priority must be implemented as selectable tags.

At minimum support:

- Low
- Normal
- High
- Important
- Immediate

Design the system so additional priority levels can be added later without restructuring the task system.

---

9. SLA / EXPECTED DURATION

The Task Manager must provide SLA tracking.

Default SLA rules:

Task Size / SLA Level| Default Duration
Normal| 4 hours
Medium| 24 hours
Large / Heavy| Maximum 48 hours

However, the creator must be able to define a custom expected duration/deadline.

Examples:

- 4 hours
- 8 hours
- 1 day
- 2 days
- 1 week

Important:

If a custom duration/deadline is explicitly configured, the custom value takes priority over the default SLA.

---

10. SLA COUNTDOWN

Every active task should display an SLA countdown.

Example:

03h 42m remaining

The UI should clearly communicate:

- On Track
- Approaching Deadline
- Overdue
- SLA Breached

Use appropriate visual states.

Example behaviour:

Normal → warning state → overdue state

Do not rely only on colour. Include readable status labels/icons so the system remains accessible.

---

11. TASK STATUS

Support at least:

- Open
- In Progress
- Blocked
- Completed
- Closed

The architecture should allow additional statuses later.

Completion and closure timestamps must be recorded automatically.

Example:

Completed At: 26 Sep 2026, 4:42 PM

Closed At: 26 Sep 2026, 5:10 PM

---

12. TASK ACTIVITY TIMELINE

Every important task event should be recorded.

Examples:

- Task created
- Task assigned
- Task reassigned
- Department assignment changed
- Priority changed
- SLA changed
- Supporting member added
- Supporting member removed
- Spectator added
- Spectator removed
- Status changed
- Comment/remark added
- Attachment uploaded
- Attachment removed
- Task completed
- Task reopened
- Task closed
- SLA warning
- SLA breached

Display these events in a chronological Activity Timeline.

---

13. COMMENTS / REMARKS / PROGRESS UPDATES

Every task should have a remarks/comments area.

Staff should be able to provide progress updates.

Example:

«Waiting for product approval.»

«Customer information received.»

«Operations team has started processing.»

Important progress updates should appear in the Activity Timeline.

---

14. TASK ATTACHMENTS — VERY IMPORTANT

Task Manager attachments MUST use the existing Secondary Cloudinary account that is already being used by Staff Messenger.

Rules:

- Reuse the existing Messenger Secondary Cloudinary configuration.
- Do NOT use the Primary Website Cloudinary account.
- Do NOT create a third Cloudinary account.
- Do NOT create a duplicate storage architecture if the existing Messenger upload infrastructure can be reused.

The architecture should conceptually be:

Task Manager Attachment
→ Existing Secondary/Messenger Cloudinary
→ Cloudinary file reference
→ Supabase metadata

Store appropriate metadata in Supabase, such as:

- Task ID
- Uploader
- Filename
- File type
- File size
- Cloudinary public ID
- Secure URL/reference
- Upload timestamp

Existing Messenger attachment functionality must continue working without modification/breakage.

Reuse existing upload/security patterns where appropriate.

---

15. RELATED CONTEXT / ENTITY REFERENCES

A task should optionally be associated with existing Ruhvi entities.

Examples:

- Order
- Product
- Support Ticket
- Customer-related support context
- Other relevant internal entity

This should remain optional.

Do NOT force every task to have a related entity.

When a related entity is attached, make the reference clickable where possible.

Examples:

Order ID → Opens Order Details

Product → Opens Product Details

Support Ticket → Opens Support Details

Do not duplicate the underlying order/product/support data.

Use references/IDs and existing routes.

---

16. OPTIONAL SUBTASKS / CHECKLIST

Advanced Options may include:

- Subtasks
- Checklist
- Checklist completion percentage

Example:

☑ Verify product information
☑ Confirm stock
☐ Send approval details
☐ Update order

Basic tasks must still work without subtasks/checklists.

---

17. OPTIONAL DEPENDENCIES

Support task dependencies as an advanced feature.

Example:

Task B cannot proceed until Task A is completed.

Possible states:

- Waiting
- Blocked
- Ready

Do not make dependencies mandatory.

---

18. TASK TYPES

Create an optional Task Type system.

Examples:

- Order Issue
- Product Information
- Customer Support
- Technical Issue
- Inventory
- Dispatch
- Approval
- Internal Request
- Other

Make Task Type extensible.

---

19. SEARCH AND FILTERING

Provide task search.

Search by:

- Task ID
- Title
- Description
- Staff name
- Department
- Order ID
- Product
- Support ticket
- Task type

Filters should include:

- Status
- Priority
- Department
- Assignee
- Creator
- Supporting Member
- Spectator
- Due date
- SLA state
- Task type

---

20. SAVED VIEWS

Allow useful task views such as:

Staff

- My Tasks
- Assigned by Me
- Due Today
- Due Soon
- Overdue
- Completed
- Supporting
- Spectating

Manager

- My Department
- Pending Assignment
- Unassigned
- High Priority
- Overdue
- SLA Breached
- Completed Today

Admin

- All Tasks
- Open
- In Progress
- Completed
- Overdue
- SLA Breached
- Department-wise
- Staff-wise

Saved views should be optional.

---

21. DASHBOARD

Create role-aware dashboards.

Staff Dashboard

Show:

- My Open Tasks
- Due Today
- Due Soon
- Overdue
- Supporting Tasks
- Spectating Tasks

Manager Dashboard

Show:

- Department Tasks
- Pending Assignment
- Overdue
- High Priority
- SLA Breached
- Completed Today

Master/Super Admin Dashboard

Show overall operational information such as:

- Total Tasks
- Open Tasks
- In Progress
- Completed
- Overdue
- SLA Breached
- Department-wise workload
- Staff-wise workload
- Completion trends
- Average completion duration
- Assignment/reassignment activity

Do not expose administrative information to unauthorized staff.

---

22. MASTER / SUPER ADMIN ACCESS

Master/Super Admin must have full visibility according to the existing staff permission architecture.

Admin should be able to view:

- All tasks
- All assignments
- All activity
- All task attachments/references
- SLA history
- Reassignment history
- Task status history
- Automation history
- Audit logs

Respect the existing authentication and authorization architecture.

Do not create a conflicting role system.

---

23. AUTOMATION ARCHITECTURE

Automation must be optional.

Basic task creation must work perfectly without automation.

Create a separate:

Automation

section/module.

Automation should support future event-driven task creation.

Examples:

Product Approved

WHEN:

Product Approved

THEN:

Create Task

Assign to:

Designated Staff

Task can automatically inherit:

- Title
- Description
- Task Type
- Priority
- SLA
- Checklist
- Supporting Members
- Spectators

---

24. AUTOMATION RULE + TASK TEMPLATE

Keep these concepts separate.

Task Template

Defines:

- Task title
- Description
- Task type
- Priority
- SLA
- Checklist
- Supporting members
- Spectators
- Other default task settings

Automation Rule

Defines:

WHEN something happens

→ CREATE a task using a selected template

→ ASSIGN it according to configured rules

Example:

Product Approved
→ Template: Product Approval Follow-up
→ Assign: Product Operations Staff
→ Priority: High
→ SLA: 24 hours

---

25. EVENT-BASED AUTOMATION

Architecture should support future events such as:

- Product Approved
- Product Rejected
- Order Dispatched
- Order Issue
- Stock Out
- Payment Failed
- Support Ticket Escalated
- Customer Complaint Created
- Other system events

Do not hard-code the architecture so that only one event can be supported.

Use an extensible event/action architecture.

---

26. RECURRING TASKS

Support recurring tasks as an optional advanced automation feature.

Examples:

- Daily
- Weekly
- Monthly
- Custom recurrence

Recurring task creation should not interfere with normal manually created tasks.

---

27. AUTOMATION SAFETY

Automation must include:

- Enable/Disable
- Pause
- Test/Preview
- Automation history
- Trigger history
- Generated Task ID
- Duplicate protection
- Error logging
- Manual fallback

If an automation fails, it must not silently fail.

---

28. NOTIFICATIONS

Reuse the existing notification infrastructure where possible.

Notifications may be triggered when:

- Task assigned
- Task reassigned
- Supporting member added
- Spectator added
- Task mentioned
- Comment added
- Priority changed
- SLA approaching
- SLA breached
- Task completed
- Task reopened
- Task closed

Do not create a completely separate notification system if an existing reliable notification system already exists.

---

29. DATABASE / DATA ARCHITECTURE

Use the existing Supabase architecture.

Design normalized, scalable tables/entities for concepts such as:

- tasks
- task_assignments
- task_supporting_members
- task_spectators
- task_comments
- task_attachments
- task_activity
- task_checklists
- task_dependencies
- task_types
- task_templates
- task_automation_rules
- task_automation_runs

Only create the tables actually required by the implemented features.

Use proper:

- Foreign keys
- Indexes
- Timestamps
- Created by / updated by
- Soft-delete strategy where appropriate
- Permission enforcement

Do not duplicate staff/user records if the existing staff tables can be referenced.

---

30. SECURITY

Task Manager is staff-only.

Enforce permissions through the existing authentication and authorization architecture.

Never rely only on frontend hiding.

Backend/database/API permissions must also be enforced.

A user must not be able to access another user's restricted task data simply by changing an ID in the URL/API request.

Validate:

- Authentication
- Authorization
- Department permissions
- Assignment permissions
- Attachment permissions
- Admin permissions

---

31. UI/UX

The UI should fit the existing Ruhvi staff/admin design system.

Do not redesign the entire application.

Task Manager should feel like a native part of the existing system.

Use:

- Clean task cards
- Clear priority badges
- SLA countdown
- Status indicators
- Assignment information
- Activity timeline
- Search/filter controls
- Responsive layout

Keep the primary task-creation screen simple.

Advanced settings should remain collapsed unless needed.

---

32. TASK DETAIL PAGE

Create a complete Task Detail view.

It should show:

Header

- Task ID
- Title
- Priority
- Status
- SLA state

Assignment

- Creator
- Assignee
- Department
- Supporting Members
- Spectators

Timing

- Created
- Started
- Expected duration
- Due date/time
- SLA countdown
- Completed
- Closed

Description

Task details.

Related Context

Order/Product/Support/etc.

Attachments

Task files using the existing Secondary/Messenger Cloudinary.

Checklist

If configured.

Comments / Remarks

Progress updates.

Activity Timeline

Full history.

---

33. AUDITABILITY

Important task actions must be auditable.

Do not overwrite historical information when an assignment, priority, SLA, or status changes.

Example:

Task assigned to A

→ reassigned to B

→ reassigned to C

The Activity Timeline must preserve all these events.

---

34. PERFORMANCE

Do not load every task and every activity record at once.

Use:

- Pagination
- Lazy loading where appropriate
- Indexed queries
- Efficient filters
- Efficient search

Task Manager must remain usable as task volume grows.

---

35. IMPLEMENTATION STRATEGY

Follow this order:

Phase 1 — Audit

First inspect the existing codebase and identify:

- Existing staff auth
- Roles
- Departments
- Managers
- Supabase schema
- APIs
- Notification system
- Messenger Cloudinary configuration
- Existing navigation
- Existing UI components

Do not modify anything during the audit phase.

Phase 2 — Architecture

Prepare the Task Manager architecture and database design.

Verify that it does not conflict with existing systems.

Phase 3 — Core Task Manager

Implement:

- Task creation
- Assignment
- Department routing
- Priority
- SLA
- Status
- Task detail
- Comments
- Activity
- Attachments
- Search/filter

Phase 4 — Collaboration

Implement:

- Supporting Members
- Spectators
- Subtasks/checklists
- Related entity references

Phase 5 — Dashboard

Implement role-based dashboards and useful views.

Phase 6 — Advanced

Implement:

- Dependencies
- Task Types
- Templates
- Saved Views

Phase 7 — Automation

Implement:

- Event-based automation
- Recurring tasks
- Auto assignment
- Escalation
- Automation history
- Duplicate protection

---

36. TESTING REQUIREMENT

Before considering implementation complete, test:

Authentication

- Authorized staff
- Unauthorized user
- Admin
- Manager
- Normal staff

Assignment

- Staff → Staff
- Staff → Department
- Manager → Staff
- Cross-department assignment
- Supporting Member
- Spectator

SLA

- Default SLA
- Custom SLA
- Countdown
- Warning
- Overdue
- Breach

Attachments

- Upload
- Download/view
- Metadata
- Permission
- Existing Messenger attachments still working
- Confirm Task Manager uses Secondary/Messenger Cloudinary
- Confirm Primary Website Cloudinary is NOT used

Related entities

- Order link
- Product link
- Support link

Automation

- Manual task
- Event trigger
- Template
- Assignment
- Duplicate protection
- Disable automation
- Failed automation logging

Regression

Verify that:

- Website still works
- Messenger still works
- Authentication still works
- Existing APIs still work
- Existing routes still work
- Existing Cloudinary integrations still work
- Existing notifications still work

---

37. IMPORTANT DEVELOPMENT RULE

If you discover an existing system that already provides a required capability, reuse it instead of creating a parallel implementation.

Examples:

Existing staff auth → reuse it.

Existing staff hierarchy → reuse it.

Existing notification system → reuse it.

Existing Messenger Secondary Cloudinary → reuse it.

Existing order/product/support routes → reference them.

Do not duplicate working infrastructure unnecessarily.

---

38. FINAL ACCEPTANCE CRITERIA

The Task Manager is considered implemented only when:

1. Staff can create a basic task quickly.
2. Any authorized staff can assign to another staff member.
3. Department assignment correctly routes to the department manager.
4. Managers can assign/reassign tasks.
5. Supporting Members work.
6. Spectators work separately from assignees.
7. Priority tags work.
8. SLA countdown works.
9. Custom duration overrides default SLA.
10. Warning and overdue states work.
11. Activity timeline records important changes.
12. Comments/remarks work.
13. Attachments work.
14. Task attachments use the existing Messenger Secondary Cloudinary.
15. Primary Website Cloudinary is never used for Task Manager attachments.
16. Order/Product/Support references work.
17. Search and filtering work.
18. Role-based dashboards work.
19. Master/Super Admin has appropriate full visibility/audit access.
20. Advanced features remain optional.
21. Automation remains separate from basic task creation.
22. Existing Messenger remains functional.
23. Existing website functionality remains functional.
24. Existing authentication remains functional.
25. Existing APIs/routes remain functional.
26. No existing feature is removed or silently changed.

---

FINAL INSTRUCTION TO ANTIGRAVITY

Do NOT blindly implement this specification immediately.

First audit the existing Ruhvi codebase and identify what already exists.

Then produce a concise implementation plan showing:

1. Existing systems that can be reused
2. Files/modules that need modification
3. New files/modules required
4. Database changes
5. API changes
6. Permission/security changes
7. Cloudinary integration point
8. Notification integration point
9. Potential compatibility risks

Only after validating the architecture should implementation begin.

Preserve all existing functionality unless a change is explicitly required for the Task Manager.