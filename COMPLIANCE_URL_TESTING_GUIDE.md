# Compliance Helpdesk URL State Testing Guide

## URL Structure Overview

**New Unified Pattern:**
```
/compliance?type={type}&id={id}&mode={mode}&tab={tab}[&annualType=COBCE|COI]
```

**All Parameters:**
- `tab` - Always present: `due-to-respond` (default) or `all`
- `type` - Compliance type: `query`, `complaint`, `gift`, `self-declaration`, `annual`
- `id` - Request/item ID
- `mode` - View mode: `view` or `respond`
- `annualType` - Annual declaration type: `COBCE` or `COI` (only for annual)
- `filter_<key>` - Applied filters. Multi-value keys (`type`, `sub_type`, `response_status`,
  `overall_status`) are comma-separated; date bounds (`updated_on_start`, `updated_on_end`,
  `response_due_start`, `response_due_end`) are single values. Omitted when empty.
- `search` - Table search text (only once it is 3+ characters, i.e. actually applied)
- `page` - 1-based page number (omitted on page 1)
- `pageSize` - Rows per page (omitted when the default 10)

**Filters / search / pagination:**
- Applying filters, clicking a stat tile, searching, or changing page updates the URL with
  `replace` (no extra history entries).
- On load the URL wins over `sessionStorage`: `?filter_*` / `search` / `page` in the link are
  used, and session state only fills in what the URL does not specify.
- Example: `/compliance?tab=all&filter_type=query,gift&filter_response_status=Overdue&search=EMP123&page=2`

---

## Test Scenarios

### 1. Base Navigation

**Test:** Navigate to `/compliance`
**Expected:** URL should redirect to `/compliance?tab=due-to-respond`
**Verify:** Default tab is active, table shows "Due to Respond" items

**Test:** Click "All" tab
**Expected:** URL changes to `/compliance?tab=all`
**Verify:** Table shows all items

**Test:** Refresh page while on "All" tab
**Expected:** URL remains `/compliance?tab=all`, "All" tab stays active

---

### 2. View/Respond Modal - Query

**Test:** Click "View" on a query from table
**Expected:** URL like `/compliance?type=query&id=Q123&mode=view&tab=due-to-respond`
**Verify:** Query modal opens in view mode

**Test:** Click "Respond" on a query from table
**Expected:** URL like `/compliance?type=query&id=Q123&mode=respond&tab=due-to-respond`
**Verify:** Query modal opens in respond mode

**Test:** Close modal
**Expected:** URL returns to `/compliance?tab=due-to-respond`
**Verify:** Modal closes, back to table

**Test:** Refresh page while query modal is open
**Expected:** Modal reopens in same mode with same data

---

### 3. Annual Declaration

**Test:** Click "View" on completed annual declaration
**Expected:** URL like `/compliance?type=annual&id=A456&mode=view&annualType=COBCE&tab=due-to-respond`
**Verify:** Annual modal opens in view mode

**Test:** Click "Respond" on pending annual declaration
**Expected:** URL like `/compliance?type=annual&id=A456&mode=respond&annualType=COBCE&tab=due-to-respond`
**Verify:** Annual modal opens in respond mode

**Test:** Switch between COBCE/COI tabs in modal
**Expected:** URL `annualType` param updates: `annualType=COI`
**Verify:** Content switches to COI view

**Test:** Close annual modal
**Expected:** URL returns to `/compliance?tab=due-to-respond`

---

### 4. Self Declaration

**Test:** Click "Respond" on non-draft self-declaration
**Expected:** URL like `/compliance?type=self-declaration&id=S789&mode=respond&tab=due-to-respond`
**Verify:** Self-declaration modal opens

**Test:** Click on draft self-declaration
**Expected:** Navigate to `/compliance/self-declaration?id=S789` (separate page)
**Verify:** Opens in edit page (not modal)

---

### 5. Recent Activities (from Home)

**Test:** Click completed recent activity from home page
**Expected:** Navigate to `/compliance?type={type}&id={id}&mode=view&tab=due-to-respond`
**Verify:** Opens in view mode (auto-detected)

**Test:** Click in-progress recent activity from home page
**Expected:** Navigate to `/compliance?type={type}&id={id}&mode=respond&tab=due-to-respond`
**Verify:** Opens in respond mode (auto-detected)

---

### 6. Quick Actions

**Test:** Click "Ask a Query" from home or footer
**Expected:** URL briefly shows `/compliance?action=query&tab=...`, then cleans to `/compliance?tab=due-to-respond`
**Verify:** RaiseQueryModal opens (no type/id in URL)

**Test:** Click "Gift Declaration"
**Expected:** Same behavior - modal opens, URL shows only tab

**Test:** Click "Self Declaration"
**Expected:** Navigate to `/compliance/self-declaration` (create page)

**Test:** Click "Annual COBCE Declaration" button
**Expected:** Fetches status, then navigates to annual declaration URL

---

### 7. Browser Back/Forward

**Test:** Open modal, then click browser back
**Expected:** Modal closes, returns to table

**Test:** Switch tabs, then click browser back
**Expected:** Previous tab becomes active

**Test:** Click browser forward after going back
**Expected:** Returns to next state in history

---

### 8. Bookmarking & Sharing

**Test:** Copy URL while viewing a query: `/compliance?type=query&id=Q123&mode=view&tab=all`
**Action:** Paste in new tab/share with colleague
**Expected:** Opens directly to query modal in view mode with "All" tab active

**Test:** Copy URL while on "All" tab: `/compliance?tab=all`
**Action:** Paste in new tab
**Expected:** Opens to "All" tab view

---

### 9. Error Handling

**Test:** Navigate to `/compliance?type=query&id=INVALID123&mode=view&tab=all`
**Expected:** Modal opens and shows error or "not found" state

**Test:** Navigate to `/compliance?type=unknown&id=123&mode=view`
**Expected:** Falls back to base compliance page

---

### 10. Tab Persistence

**Test:** Open query modal on "Due to Respond" tab
**Expected:** URL includes `tab=due-to-respond`

**Test:** Switch to "All" tab while modal is open
**Expected:** URL updates to `tab=all`

**Test:** Close modal
**Expected:** Returns to `/compliance?tab=all` (preserves current tab)

---

## Common Issues to Check

### ❌ Issue: Tab param missing from URL
**Fix:** Check that `buildComplianceUrl` is always called with `tab` parameter

### ❌ Issue: Modal doesn't reopen after refresh
**Fix:** Verify `parseComplianceUrl` and mount effect in ComplianceHelpdesk

### ❌ Issue: URL updates but modal doesn't change
**Fix:** Check that modal components are keyed or reset properly on URL change

### ❌ Issue: Browser back goes to unexpected page
**Fix:** Ensure using `replace: true` for modal open/close, not `push`

### ❌ Issue: Annual type not switching in URL
**Fix:** Verify `syncAnnualTypeInUrl` is wired to tab change handler

---

## Developer Notes

**File Locations:**
- URL utilities: `src/utils/complianceUrlUtils.js`
- Main component: `src/pages/ComplianceHelpdesk.jsx`
- Recent activity utils: `src/utils/recentActivityUtils.js`
- Annual utils: `src/utils/annualDeclarationUtils.js`

**Key Functions:**
- `parseComplianceUrl(search)` - Parse URL to state object
- `buildComplianceUrl(options)` - Build URL from state
- `buildComplianceItemUrl(item, options)` - Build URL for table row (auto-detects mode)

**Constants:**
- `COMPLIANCE_TYPES` - Valid type values
- `COMPLIANCE_TABS` - Valid tab values
- `COMPLIANCE_MODES` - Valid mode values
- `DEFAULT_TAB` - Default tab when not specified

---

## Success Criteria

✅ All URLs are shareable/bookmarkable
✅ Page refresh restores exact state
✅ Tab always visible in URL
✅ Modal open/close updates URL cleanly
✅ Browser history is clean (no duplicate entries)
✅ Auto-mode detection works (completed → view, pending → respond)
✅ All compliance types use consistent URL pattern
