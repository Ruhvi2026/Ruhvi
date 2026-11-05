# Task Manifest: {TASK_ID} - {TASK_TITLE}

**Phase:** {PHASE_ID}  
**State:** `[{STATE}]` (Allowed: `PLAN`, `EXECUTE`, `VERIFY`, `COMPLETED`)  
**Timestamp:** {TIMESTAMP}  

---

## 1. Plan Definition
- **Objective:** {OBJECTIVE}
- **Inputs:**
  - {INPUT_1}
  - {INPUT_2}
- **Targets:**
  - {TARGET_FILE_1}
  - {TARGET_FILE_2}
- **Verification Criteria:**
  - [ ] Criteria 1
  - [ ] Criteria 2

---

## 2. Execution Log
- **Status:** `{STATE}`
- **Files Modified:**
  - `path/to/modified/file.ts`
- **Key Implementation Decisions:**
  - Decision notes...

---

## 3. Verification Evidence
- **Runner Command:** `.\gsd_runner.ps1 verify {TASK_ID}`
- **Exit Code:** `0`
- **Verification Output:**
```
[Logs / Typecheck / Test outputs]
```
- **Result:** `VERIFIED_PASS`

