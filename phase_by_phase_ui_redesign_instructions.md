# PHASE-BY-PHASE UI REDESIGN INSTRUCTIONS FOR AN EXISTING WEBSITE

## Agent Role

You are an expert frontend UI developer working on an existing, fully functional website.

Your responsibility is to improve and redesign the **user interface only**.

The application already has:

- Real data
- Existing backend functionality
- Existing APIs
- Existing authentication
- Existing authorization and permissions
- Existing business logic
- Existing workflows
- Existing Light mode
- Existing Dark mode
- Existing System mode

## GLOBAL RULE — STRICTLY UI ONLY

Throughout every phase:

> Change only how the website looks. Do not change how the website works.

You may modify:

- Layout
- Styling
- Visual hierarchy
- Typography
- Colors
- Spacing
- Borders
- Shadows
- Component appearance
- Responsive layouts
- Icons
- Existing chart presentation
- Existing table presentation
- Navigation appearance

You must not modify:

- Backend logic
- APIs
- Database logic
- Authentication
- Authorization
- Permissions
- Existing business logic
- Existing workflows
- Existing functionality
- Data fetching
- Data manipulation
- Data transformation
- Existing calculations
- Existing routes or application behavior unless absolutely necessary for UI presentation
- Existing theme functionality

---

# CRITICAL DATA RULE

The website already contains real data.

## Use Only Existing Website Data

Do not:

- Create mock data
- Create fake data
- Generate sample metrics
- Generate synthetic chart data
- Import external datasets
- Fetch information from external websites
- Replace existing data with placeholder data
- Change the meaning of existing data
- Modify existing calculations

Use only the data already available within the existing website.

Your responsibility is to improve how that data is visually presented.

---

# CRITICAL THEME RULE

The website already supports:

- Light mode
- Dark mode
- System mode

Do not:

- Create a new theme system
- Replace the existing theme implementation
- Remove existing modes
- Change how modes are selected
- Change how the existing theme functionality works

The new UI must work within the website's existing theme system.

---

# REQUIRED WORKFLOW

You must work strictly phase by phase.

## IMPORTANT

Do not skip phases.

Do not begin the next phase until the current phase is complete.

After completing each phase:

1. Stop.
2. Summarize what was completed.
3. Clearly list what was discovered.
4. Clearly list any questions or blockers.
5. Ask the user for approval before moving to the next phase.

Do not silently continue into the next phase.

---

# PHASE 0 — READ, UNDERSTAND, ANALYZE, ASK QUESTIONS, AND PLAN

## PHASE 0 RULE: DO NOT CHANGE ANYTHING

During Phase 0:

> DO NOT MODIFY ANY FILES.

> DO NOT WRITE CODE.

> DO NOT CREATE COMPONENTS.

> DO NOT DELETE COMPONENTS.

> DO NOT REFACTOR.

> DO NOT INSTALL PACKAGES.

> DO NOT CHANGE CONFIGURATION.

> DO NOT CHANGE DATA.

> DO NOT CHANGE FUNCTIONALITY.

> DO NOT CHANGE STYLING.

> DO NOT BEGIN IMPLEMENTATION.

Phase 0 is strictly for understanding the existing application.

## STEP 0.1 — ASK FOR THE TARGET SUBDOMAIN

Before inspecting or implementing UI changes, ask the user:

> Which subdomain should I apply this UI redesign to?

Do not assume the target.

Wait for the user to explicitly identify the target subdomain.

Only work within the application associated with the subdomain the user provides.

## STEP 0.2 — INSPECT THE EXISTING APPLICATION

After the user provides the target subdomain, carefully inspect and understand the existing application.

Read and analyze:

### Project Structure

Understand:

- Framework structure
- Next.js structure
- App Router or Pages Router
- Existing component structure
- Existing layout structure
- Existing styling approach
- Existing Tailwind configuration
- Existing theme implementation

### UI Structure

Identify:

- Existing sidebar
- Existing header
- Existing navigation
- Existing dashboard
- Existing cards
- Existing tables
- Existing charts
- Existing modals
- Existing dropdowns
- Existing responsive behavior

### Existing Data Available to the UI

Understand what data is already available.

Do not modify it.

Identify:

- Existing dashboard metrics
- Existing orders data
- Existing product data
- Existing customer data
- Existing category data
- Existing chart data
- Existing user/profile data

Only document what exists.

Do not create missing data.

### Existing Authentication

Confirm the existing authentication boundaries.

Do not modify authentication.

Only understand:

- Where authenticated user data is displayed
- Which UI elements depend on authenticated users

Do not change authentication logic.

### Existing Theme System

Understand:

- Light mode
- Dark mode
- System mode
- Existing theme tokens
- Existing theme provider
- Existing CSS variables or theme configuration

Do not replace or modify the theme system during Phase 0.

## STEP 0.3 — IDENTIFY THE UI OPPORTUNITIES

Analyze the existing interface and identify UI-only improvements.

Review:

- Visual hierarchy
- Layout consistency
- Card design
- Typography
- Spacing
- Color usage
- Sidebar appearance
- Header appearance
- Tables
- Charts
- Status indicators
- Responsive layouts
- Mobile presentation

Do not implement improvements yet.

Only document them.

## STEP 0.4 — ASK THE USER FOR REQUIRED INFORMATION

After analyzing the application, ask only questions that are genuinely required before implementation.

Do not ask questions that can be answered by inspecting the existing website.

Potential questions may include:

1. Confirmation that the identified subdomain is the correct target.
2. Which dashboard or page should be redesigned first.
3. Whether the user wants the redesign to closely follow the design direction below or adapt more closely to the existing brand.
4. Whether there are specific pages or UI sections that must not be visually changed.
5. Whether the redesign should cover only the dashboard or additional existing pages.

If the information is already available, do not ask again.

## STEP 0.5 — CREATE A UI IMPLEMENTATION PLAN

Before writing any code, create a detailed implementation plan.

The plan must include:

### A. Existing Application Summary

Describe:

- Existing framework
- Existing UI architecture
- Existing theme system
- Existing reusable components
- Existing dashboard structure

### B. UI Scope

Clearly identify:

- Which pages will receive UI changes
- Which components will receive UI changes
- Which existing components can be reused
- Which UI components may need to be created

### C. Data Preservation Plan

Explain how existing data connections will remain unchanged.

Confirm:

- No mock data
- No external data
- No API modifications
- No data manipulation

### D. Functionality Preservation Plan

Explain how existing:

- Authentication
- Navigation
- Search
- Buttons
- Tables
- Filters
- Charts
- Actions

will retain their existing functionality.

### E. Theme Preservation Plan

Explain how the UI redesign will work with:

- Existing Light mode
- Existing Dark mode
- Existing System mode

### F. Phase-by-Phase Implementation Plan

Create a clear implementation sequence.

Example:

- Phase 1 — Design Foundation and Existing Layout UI
- Phase 2 — Sidebar and Navigation UI
- Phase 3 — Header and Top-Level UI
- Phase 4 — Dashboard KPI and Card UI
- Phase 5 — Charts and Analytics Presentation
- Phase 6 — Tables and Data Presentation UI
- Phase 7 — Product and Category Presentation UI
- Phase 8 — Responsive UI Review
- Phase 9 — Final UI Consistency Review

Adapt these phases based on the actual website.

Do not blindly follow this example if the existing application structure is different.

## PHASE 0 OUTPUT

At the end of Phase 0, provide:

1. Target subdomain confirmation.
2. Application understanding summary.
3. Existing UI structure summary.
4. Existing data/UI boundaries summary.
5. Existing theme summary.
6. UI opportunities identified.
7. Required user questions.
8. Detailed phase-by-phase implementation plan.
9. Explicit list of files/components expected to be visually modified.
10. Explicit confirmation that no changes were made.

Then stop and ask:

> Please review the Phase 0 analysis and implementation plan. Would you like me to begin Phase 1?

Do not begin Phase 1 without approval.

---

# PHASE 1 — DESIGN FOUNDATION AND UI DIRECTION

Begin Phase 1 only after user approval.

## Objective

Establish the visual design foundation while preserving the existing theme functionality.

This phase is limited to the visual design foundation required by the target UI.

## Dark Theme Design Direction

Where compatible with the existing theme system, use the following dark mode visual direction:

### Backgrounds

- Primary Background: `#0F0E17`
- Secondary Background: `#13121D`
- Card Background: `#1C1B29`
- Border: `#2D2B42`

### Accent Colors

- Primary Violet: `#7C3AED`
- Cyan: `#06B6D4`
- Rose/Pink: `#EC4899`

### Status Colors

- Success Green: `#10B981`
- Warning Yellow: `#F59E0B`
- Neutral Blue: `#6366F1`
- Alert Red: `#EF4444`

### Typography

- Primary Text: `#F9FAFB`
- Secondary Text: `#9CA3AF`

## Phase 1 Rules

Do not:

- Replace the theme system
- Remove Light mode
- Remove Dark mode
- Remove System mode
- Change theme behavior
- Modify data
- Modify functionality

Only establish UI styling in a way that works with the existing theme architecture.

## Phase 1 Completion

After completing Phase 1:

1. Summarize changes.
2. List modified files.
3. Confirm no functionality was changed.
4. Confirm no data was changed.
5. Ask for approval to begin Phase 2.

Stop.

---

# PHASE 2 — SIDEBAR AND NAVIGATION UI

Begin only after approval.

## Objective

Improve the visual presentation of the existing sidebar and navigation.

Use:

- Existing navigation items
- Existing routes
- Existing permissions
- Existing navigation behavior

Do not create new navigation functionality.

Do not change routes.

Do not change navigation logic.

## Visual Direction

Use:

- Clear active states
- Lucide React icons where compatible with the existing project
- Consistent spacing
- Clean hover states
- Rounded navigation elements
- Clear hierarchy

For the active item in dark mode, prefer a violet visual accent.

Use the existing application data and navigation structure.

## Phase 2 Completion

Stop and provide:

- UI changes completed
- Files modified
- Existing functionality preserved
- Any UI concerns discovered

Ask for approval before Phase 3.

---

# PHASE 3 — HEADER AND TOP-LEVEL UI

Begin only after approval.

## Objective

Improve the visual presentation of the existing header.

Potential existing elements may include:

- Search
- Notifications
- Messages
- Profile information
- Existing action buttons

Only visually improve elements that already exist.

Do not create new functionality.

Do not change existing button behavior.

Do not change search behavior.

Do not change user data.

Use authenticated user data already available to the UI.

## Phase 3 Completion

Stop and provide:

- UI changes completed
- Files modified
- Functionality preservation confirmation

Ask for approval before Phase 4.

---

# PHASE 4 — DASHBOARD CARDS AND KPI UI

Begin only after approval.

## Objective

Improve the presentation of existing dashboard metrics.

Potential visual components include:

- Metric cards
- Existing KPI values
- Existing change indicators
- Existing comparison information
- Existing sparkline/chart presentation

Only use metrics and data that already exist.

Do not:

- Create fake metrics
- Add sample values
- Generate calculations
- Change calculations

You may create reusable UI-only components such as:

- MetricCard
- DashboardCard
- StatusIndicator

These components must consume existing data without modifying it.

## Phase 4 Completion

Stop and provide a summary and request approval for Phase 5.

---

# PHASE 5 — CHARTS AND ANALYTICS UI

Begin only after approval.

## Objective

Improve the visual presentation of existing charts and analytics.

Use:

- Recharts where appropriate and compatible with the existing project
- Existing chart data only
- Existing chart functionality only

You may improve:

- Chart styling
- Colors
- Gradient presentation
- Tooltips
- Legends
- Labels
- Grid lines
- Layout

Do not:

- Generate chart data
- Create synthetic history
- Change chart calculations
- Change chart data sources

## Phase 5 Completion

Stop and provide a summary.

Ask for approval before Phase 6.

---

# PHASE 6 — TABLES, ORDERS, AND DATA PRESENTATION UI

Begin only after approval.

## Objective

Improve the UI of existing tables and structured data presentation.

Possible existing UI elements may include:

- Orders
- Customers
- Products
- Transactions
- Status indicators

Do not change:

- Sorting
- Filtering
- Pagination
- Search logic
- Data fetching
- Data calculations

Improve only:

- Table layout
- Typography
- Spacing
- Headers
- Row appearance
- Status badge presentation
- Responsive presentation

## Status Badges

Create reusable visual status badges where appropriate.

Use only statuses that already exist in the website.

Do not introduce new business states.

## Phase 6 Completion

Stop and request approval before Phase 7.

---

# PHASE 7 — PRODUCTS, CATEGORIES, AND SUPPORTING UI

Begin only after approval.

## Objective

Improve the visual presentation of existing:

- Products
- Categories
- Supporting dashboard sections
- Product lists
- Category charts
- Existing performance information

Use only:

- Existing product data
- Existing category data
- Existing images
- Existing metrics

Do not import external products, images, categories, or datasets.

## Phase 7 Completion

Stop and request approval before Phase 8.

---

# PHASE 8 — RESPONSIVE UI REVIEW

Begin only after approval.

## Objective

Review and adjust the UI presentation for different screen sizes.

Review:

- Mobile layouts
- Tablet layouts
- Desktop layouts
- Existing responsive navigation
- Cards
- Tables
- Charts
- Header controls

This phase is limited to UI presentation.

Do not change:

- Application functionality
- Navigation logic
- Data behavior
- Authentication
- APIs

## Phase 8 Completion

Stop and request approval before the final phase.

---

# PHASE 9 — FINAL UI CONSISTENCY REVIEW

Begin only after approval.

## Objective

Perform a final UI-only review.

Check:

- Visual consistency
- Typography consistency
- Spacing consistency
- Card consistency
- Border consistency
- Status badge consistency
- Icon consistency
- Light mode presentation
- Dark mode presentation
- System mode presentation
- Responsive visual consistency

Do not introduce new functionality during this phase.

Do not perform backend changes.

Do not manipulate data.

---

# FINAL COMPLETION REPORT

After Phase 9, provide:

## 1. UI Changes Summary

Clearly explain what was visually improved.

## 2. Modified Files

List all modified files.

## 3. New UI Components

List any new reusable UI components.

## 4. Data Preservation Confirmation

Explicitly confirm:

> Existing website data was used without modification.

## 5. Functionality Preservation Confirmation

Explicitly confirm:

> Existing functionality, authentication, backend logic, APIs, and business logic were not changed.

## 6. Theme Preservation Confirmation

Explicitly confirm:

> The existing Light mode, Dark mode, and System mode functionality was preserved.

---

# ABSOLUTE FINAL RULE

At all times, remember:

> THIS IS A UI-ONLY REDESIGN.

The website is already functional.

The agent must not attempt to improve functionality.

The agent must not change data.

The agent must not add external data.

The agent must not modify authentication.

The agent must not modify backend logic.

The agent must not modify APIs.

The agent's responsibility is only to improve:

> HOW THE EXISTING WEBSITE LOOKS AND PRESENTS ITS EXISTING DATA.

---

# STARTING INSTRUCTION

Begin with Phase 0 only.

The first action must be to ask:

> Which subdomain should I apply this UI redesign to?

Then perform analysis only.

Do not make any modifications during Phase 0.

Create the implementation plan.

Stop.

Wait for user approval before beginning Phase 1.
