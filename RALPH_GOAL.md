# RALPH_GOAL.md — Autonomous Goal Definition

**Goal ID:** `RALPH-GOAL-002`  
**Title:** Implement & Validate Factorial Utility Function  
**Target State:** `ACTIVE`  
**Max Retries:** 5  
**Timeout Per Iteration:** 60s  

---

## 1. High-Level Objective
Implement `factorial(n)` in `src/lib/math_utils.ts` and verify with Jest unit tests in `src/lib/__tests__/math_utils.test.ts`.

---

## 2. Execution Command & Target Gates
- **Primary Run Command:** `npx jest src/lib/__tests__/math_utils.test.ts`
- **Validation Command:** `npx jest src/lib/__tests__/math_utils.test.ts`
- **Completion Check:** Validation command exits with code `0`.

---

## 3. Acceptance Criteria
- [x] `factorial(0)` returns 1.
- [x] `factorial(5)` returns 120.
- [x] Negative or non-integer inputs throw `RangeError`.
- [x] Jest test suite passes with 0 failures.
