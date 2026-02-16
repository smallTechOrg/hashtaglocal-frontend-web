# Analytics Quick Reference

## 🚀 Quick Start

All analytics are automatically tracked! No additional setup needed - the system works with your existing Google Analytics setup (ID: G-ZYDZM87HR8).

## 📊 What's Tracked Automatically

### ✅ Every Page
- Page views
- Scroll depth (25%, 50%, 75%, 90%, 100%)
- Time spent on page
- User journey steps

### ✅ Dashboard
- Filter changes (hashtag, status, type)
- Pagination clicks
- Issue card views
- Edit actions
- All user interactions

### ✅ Issue Details
- Issue views (with ID and type)
- Share/copy link
- Google Maps clicks
- Edit actions
- Media views

### ✅ Map
- Marker clicks
- Filter changes
- Detail card views
- Navigation

### ✅ Navigation
- Header/footer links
- Join form submissions
- All internal navigation

## 🎯 Tracked Events Summary

| Event | Category | When It Fires |
|-------|----------|---------------|
| `page_view` | navigation | Every route change |
| `scroll_depth` | engagement | At 25%, 50%, 75%, 90%, 100% scroll |
| `time_on_page` | engagement | When leaving page |
| `click` | user_interaction | Any tracked button/link |
| `issue_view` | issue | Issue detail page load |
| `issue_filter` | filter | Filter change |
| `issue_share` | issue | Copy link action |
| `map_marker_click` | user_interaction | Map marker click |
| `filter_change` | filter | Any filter change |
| `api_error` | error | API failures |
| `journey_step` | navigation | User journey milestones |

## 📈 View Analytics Data

1. Go to [Google Analytics](https://analytics.google.com)
2. Select property ID: **G-ZYDZM87HR8**
3. View real-time events: **Reports > Realtime**
4. View all events: **Engagement > Events**
5. View journeys: **User Attributes > Journey**

## 🛠️ Adding Custom Tracking

### Track a Button Click
```typescript
import { useClickTracking } from '../hooks/useClickTracking';
import { EventCategory } from '../utils/analytics';

const trackClick = useClickTracking();

<button onClick={() => trackClick('Button Name', EventCategory.USER_INTERACTION)}>
  Click Me
</button>
```

### Track a Page
```typescript
import { useScrollTracking, useTimeTracking } from '../hooks/useScrollTracking';

export default function MyPage() {
  useScrollTracking(); // Auto scroll tracking
  useTimeTracking('/my-page'); // Auto time tracking
  
  return <div>Content</div>;
}
```

### Track Custom Events
```typescript
import { trackEvent, EventCategory } from '../utils/analytics';

trackEvent('my_custom_event', {
  event_category: EventCategory.USER_INTERACTION,
  event_label: 'Custom Label',
  custom_param: 'value'
});
```

## 🔍 Event Categories

- `user_interaction` - Clicks, hovers, general interactions
- `navigation` - Page changes, route transitions
- `issue` - Issue-related actions
- `filter` - Filter changes
- `engagement` - Scroll, time, external links
- `error` - Errors and failures

## ✨ Key Features

✅ **Zero Configuration** - Works with existing GA setup  
✅ **Automatic Tracking** - Page views, scrolls, time tracking  
✅ **User Journey** - Complete journey tracking  
✅ **Error Tracking** - Automatic API error logging  
✅ **Performance** - Optimized with throttling  
✅ **Privacy** - No sensitive data collected  

## 🐛 Debugging

Check Chrome DevTools:
- **Network Tab** → Filter by "collect" → See GA requests
- **Console** → Look for "Analytics tracking error"
- **GA DebugView** → Real-time event validation

## 📝 Files

- `src/app/utils/analytics.ts` - Core utilities
- `src/app/context/AnalyticsContext.tsx` - Provider
- `src/app/hooks/useScrollTracking.ts` - Scroll/time hooks
- `src/app/hooks/useClickTracking.ts` - Click tracking hook

---

**Need Help?** See full docs: [ANALYTICS_DOCUMENTATION.md](./ANALYTICS_DOCUMENTATION.md)
