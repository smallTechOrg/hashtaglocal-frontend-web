# Analytics Testing Checklist ✅

Use this checklist to verify all analytics are working correctly.

## Pre-Testing Setup

- [ ] Open Google Analytics (https://analytics.google.com)
- [ ] Navigate to property G-ZYDZM87HR8
- [ ] Open **Reports > Realtime** view
- [ ] Keep GA open in another tab
- [ ] Open Chrome DevTools > Network tab
- [ ] Filter Network by "collect"

## 🌐 Page View Tracking

- [ ] Visit home page - should see `page_view` event
- [ ] Navigate to /dashboard - should see `page_view` event
- [ ] Navigate to any issue (/issue/123) - should see `page_view` event
- [ ] Navigate to /join - should see `page_view` event
- [ ] Check GA Realtime shows page views

## 📜 Scroll Tracking

- [ ] Load home page
- [ ] Scroll to 25% - should see `scroll_depth` event (25%)
- [ ] Scroll to 50% - should see `scroll_depth` event (50%)
- [ ] Scroll to 75% - should see `scroll_depth` event (75%)
- [ ] Scroll to 90% - should see `scroll_depth` event (90%)
- [ ] Scroll to bottom - should see `scroll_depth` event (100%)
- [ ] Check GA Events for scroll_depth events

## 🗺️ Dashboard Interactions

### Filters
- [ ] Change hashtag filter - should see `issue_filter` event
- [ ] Change status filter - should see `issue_filter` event
- [ ] Change type filter - should see `issue_filter` event
- [ ] Click "Clear all" - should see `click` event
- [ ] Check GA Events shows all filter changes

### Map
- [ ] Click map marker - should see `map_marker_click` event
- [ ] Click city dropdown - should see `click` event
- [ ] Change map filter - should see `issue_filter` event
- [ ] Click "Back to latest" - should see `click` event
- [ ] Click "View details" from map card - should see `click` event

### Issue Cards
- [ ] Click "View" on issue card - should see `click` event with issue_id
- [ ] Click "Edit" (if available) - should see `click` event
- [ ] Click pagination button - should see `click` event
- [ ] Check all clicks are tracked with proper labels

## 🔍 Issue Detail Page

- [ ] Visit issue detail page - should see `issue_view` event
- [ ] Click "Back to Home" - should see `click` event
- [ ] Click "Copy Link" - should see `issue_share` event
- [ ] Verify copied toast appears
- [ ] Click "Open in Maps" - should see `external_link_click` event
- [ ] Click issue image - should see `click` event
- [ ] Click "Edit" (if available) - should see `click` event
- [ ] Check GA shows all issue interactions

## 📰 News Feed

- [ ] Click news category filter - should see `filter_change` event
- [ ] Click on news card - should see `news_article_view` event
- [ ] Modal should open
- [ ] Click "Open original article" - should see `news_article_click` event
- [ ] Click "Close" or X - should see `click` event
- [ ] Click "Load More" - should see `click` event
- [ ] Check GA shows all news interactions

## 🚀 Navigation & Forms

- [ ] Click logo in header - should see `click` event
- [ ] Click "Join The Movement" button - should see `click` event
- [ ] Fill and submit join form - should see `form_submission` event
- [ ] Check all navigation clicks tracked

## ⏱️ Time Tracking

- [ ] Stay on a page for 5+ seconds
- [ ] Navigate away
- [ ] Should see `time_on_page` event
- [ ] Check event has duration in seconds

## 🚨 Error Tracking

- [ ] Simulate API error (disconnect internet briefly)
- [ ] Try to load dashboard
- [ ] Should see `api_error` event
- [ ] Reconnect and verify error logged
- [ ] Check GA Events for error details

## 🧭 User Journey

- [ ] Complete a full journey:
  1. Land on home page
  2. Filter issues
  3. View an issue
  4. Share issue
  5. Read news
  6. Click join button
- [ ] Check GA for journey_step events
- [ ] Verify sequence is logical

## 📊 GA Dashboard Checks

### Realtime View
- [ ] See active users
- [ ] See event count
- [ ] See page views

### Events Report
- [ ] Navigate to Engagement > Events
- [ ] Verify events appear:
  - [ ] page_view
  - [ ] scroll_depth
  - [ ] click
  - [ ] issue_view
  - [ ] issue_filter
  - [ ] map_marker_click
  - [ ] news_article_view
  - [ ] news_article_click
  - [ ] time_on_page
  - [ ] journey_step

### Event Parameters
- [ ] Click on an event
- [ ] Verify parameters are populated:
  - [ ] event_category
  - [ ] event_label
  - [ ] Custom parameters (issue_id, etc.)

## 🔧 DevTools Verification

### Network Tab
- [ ] Filter by "collect"
- [ ] See GA requests being sent
- [ ] Check request payloads contain event data
- [ ] Verify measurement ID: G-ZYDZM87HR8

### Console
- [ ] No "Analytics tracking error" messages
- [ ] No JavaScript errors related to analytics
- [ ] Clean console output

## 🎯 Advanced Testing

### Multiple Tabs
- [ ] Open site in 2 tabs
- [ ] Interact in both
- [ ] Verify GA shows 2 active users

### Mobile Testing
- [ ] Open DevTools device emulation
- [ ] Test on mobile viewport
- [ ] Verify all events still fire
- [ ] Check touch interactions work

### Incognito Mode
- [ ] Open in incognito/private window
- [ ] Verify tracking works
- [ ] Check GA Realtime updates

## ✅ Final Verification

- [ ] All page views tracked ✓
- [ ] All clicks tracked ✓
- [ ] All filters tracked ✓
- [ ] Scroll depth tracked ✓
- [ ] Time on page tracked ✓
- [ ] User journey tracked ✓
- [ ] Errors tracked ✓
- [ ] No console errors ✓
- [ ] No TypeScript errors ✓
- [ ] GA dashboard shows data ✓

## 🐛 If Something Doesn't Work

1. **Check Console** - Look for JavaScript errors
2. **Check Network** - Verify GA requests are sent
3. **Check GA Realtime** - Events appear within 5-10 seconds
4. **Verify GA ID** - Confirm G-ZYDZM87HR8 in layout.tsx
5. **Clear Cache** - Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
6. **Try Incognito** - Test in private window

## 📝 Notes

- Events may take 5-10 seconds to appear in GA Realtime
- Some events are throttled to prevent spam
- Journey steps persist for the session
- Scroll events fire once per threshold
- Time tracking fires on page exit

---

**All Green?** 🎉 Your analytics are working perfectly!

**Issues?** Check documentation or review the implementation code.
