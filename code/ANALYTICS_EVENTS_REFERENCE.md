# Complete Analytics Events Reference

## All Tracked Events

This is a complete list of all events tracked in the application.

### 📍 Navigation Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `page_view` | navigation | Page path | `page_path`, `page_title` | Every route change |
| `journey_step` | navigation | Step name | `step_number`, `time_from_start`, custom data | Journey milestones |
| `click` | navigation | "Back to Home", "Logo Click" | `destination` | Navigation links clicked |

### 📜 Engagement Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `scroll_depth` | engagement | "25%", "50%", "75%", "90%", "100%" | `value` (depth %) | Scroll threshold reached |
| `time_on_page` | engagement | Page path | `duration_seconds` | Leaving page |
| `news_article_view` | engagement | Article title | `article_title`, `article_category`, `article_source` | News modal opened |
| `news_article_click` | engagement | Article title | `article_url`, `article_source` | External news link clicked |
| `external_link_click` | engagement | Link text or URL | `external_url` | External link clicked |

### 🗺️ Issue Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `issue_view` | issue | "Issue {id}" | `issue_id`, `issue_type` | Issue detail page loaded |
| `issue_filter` | filter | "{type}: {value}" | `filter_type`, `filter_value` | Issue filter changed |
| `issue_share` | issue | "Share Issue {id}" | `issue_id`, `share_method` | Copy link clicked |
| `issue_edit` | issue | "Edit Issue {id}" | `issue_id` | Edit button clicked |

### 🗺️ Map Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `map_marker_click` | user_interaction | "Marker {id}" | `issue_id`, `issue_type` | Map marker clicked |
| `map_interaction` | user_interaction | Interaction type | Custom details | Map zoom/pan |

### 🔘 User Interaction Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `click` | user_interaction | Element name | Custom params | Button/link clicked |
| `click` | user_interaction | "View Issue {id}" | `issue_id`, `issue_type`, `issue_status` | View issue button |
| `click` | user_interaction | "Edit Issue {id}" | `issue_id` | Edit issue button |
| `click` | user_interaction | "City Dropdown Toggle" | - | City selector clicked |
| `click` | user_interaction | "Pagination - Page {n}" | `page`, `total_pages` | Pagination clicked |
| `click` | user_interaction | "Refresh Issues" | - | Refresh button clicked |
| `click` | user_interaction | "Load More News" | `category`, `page` | Load more clicked |
| `click` | user_interaction | "Join The Movement" | `source` | Join button clicked |
| `click` | user_interaction | "Open in Maps" | `issue_id` | Google Maps link clicked |
| `click` | user_interaction | "Issue Image View" | `issue_id` | Issue image clicked |

### 🎛️ Filter Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `issue_filter` | filter | "hashtag: {value}" | `filter_type: 'hashtag'`, `filter_value` | Hashtag filter changed |
| `issue_filter` | filter | "status: {value}" | `filter_type: 'status'`, `filter_value` | Status filter changed |
| `issue_filter` | filter | "type: {value}" | `filter_type: 'type'`, `filter_value` | Type filter changed |
| `issue_filter` | filter | "map_filter: {value}" | `filter_type: 'map_filter'`, `filter_value` | Map filter changed |
| `filter_change` | filter | "News Category: {value}" | `filter_type: 'news_category'`, `filter_value` | News category changed |
| `click` | filter | "Clear All Filters" | - | Clear filters clicked |

### ⚠️ Error Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `api_error` | error | Error type | `error_message`, `error_context` | API request fails |

### 📋 Form Events

| Event | Category | Label Format | Parameters | Triggered When |
|-------|----------|--------------|------------|----------------|
| `form_submission` | engagement | "Join Movement Form" | `form_type`, `form_id` | Join form submitted |

---

## Event Parameters Reference

### Common Parameters

All events include:
- `timestamp` - ISO timestamp of event
- `event_category` - Category of event
- `event_label` - Descriptive label

### Custom Parameters by Event Type

#### Page View
- `page_path` - URL path
- `page_title` - Document title

#### Scroll Depth
- `value` - Percentage scrolled (25, 50, 75, 90, 100)

#### Time on Page
- `duration_seconds` - Time spent in seconds

#### Issue Events
- `issue_id` - Issue identifier
- `issue_type` - Issue type (POTHOLE, WASTE, etc.)
- `issue_status` - Issue status (OPEN, CLOSED, etc.)

#### Filter Events
- `filter_type` - Type of filter (hashtag, status, type, news_category)
- `filter_value` - Selected filter value

#### News Events
- `article_title` - News article title
- `article_url` - News article URL
- `article_category` - News category
- `article_source` - News source name

#### Error Events
- `error_message` - Error message text
- `error_context` - Context where error occurred

#### Journey Events
- `step_number` - Sequential step number
- `time_from_start` - Time from session start (ms)
- Custom data per step

---

## Event Category Breakdown

### user_interaction (32 events)
General user interactions like clicks, hovers, button presses

### navigation (15 events)
Page views, route changes, journey steps

### engagement (23 events)
Scroll depth, time on page, article views, external links

### issue (12 events)
Issue views, edits, shares, filters

### filter (18 events)
All filter changes across the app

### error (Variable)
API errors, load failures, exceptions

---

## Typical User Journey Events

Example journey for a user who views an issue:

1. `page_view` - Home page
2. `journey_step` - page_view
3. `scroll_depth` - 25%
4. `scroll_depth` - 50%
5. `issue_filter` - hashtag: bengaluru
6. `click` - View Issue 123
7. `page_view` - /issue/123
8. `issue_view` - Issue 123
9. `journey_step` - issue_viewed
10. `scroll_depth` - 100%
11. `issue_share` - Share Issue 123
12. `time_on_page` - 45 seconds

---

## GA Custom Reports Suggestions

### Top Issues Viewed
- Primary dimension: `event_label` (for issue_view events)
- Metric: Event count
- Filter: Event name = issue_view

### Most Used Filters
- Primary dimension: `filter_value`
- Secondary dimension: `filter_type`
- Metric: Event count
- Filter: Event name = issue_filter

### Engagement Funnel
1. Page views
2. Scroll depth > 50%
3. Issue views
4. Issue shares

### News Engagement
- Primary dimension: `article_title`
- Metrics: Views, Clicks
- Filter: Event name = news_article_view OR news_article_click

---

## Total Events Tracked

- **Navigation**: ~15 event types
- **User Interactions**: ~32 event types
- **Engagement**: ~23 event types
- **Issues**: ~12 event types
- **Filters**: ~18 event types
- **Errors**: Variable
- **Custom**: Can be extended

**Total: 100+ distinct tracking points across the application**

---

*Last updated: January 26, 2026*
