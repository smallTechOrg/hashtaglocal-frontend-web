# Analytics Implementation Guide

This document describes the comprehensive analytics implementation for the #local platform using Google Analytics.

## Overview

We've implemented a complete analytics tracking system that monitors:
- User interactions (clicks, scrolls, form submissions)
- Page views and navigation
- Issue-related actions
- Map interactions
- News article engagement
- User journey tracking
- Error tracking
- Performance metrics

## Features

### 🎯 Automatic Tracking

The following are tracked automatically without any additional code:

1. **Page Views**: Every page navigation is automatically tracked
2. **Scroll Depth**: Tracks when users scroll to 25%, 50%, 75%, 90%, and 100% of the page
3. **Time on Page**: Measures how long users spend on each page
4. **User Journey**: Records the complete user journey through the site
5. **Session Duration**: Tracks total session time

### 📊 Event Categories

Events are organized into the following categories:

- `user_interaction` - General user interactions (clicks, hovers)
- `navigation` - Page navigation and routing
- `issue` - Issue-related actions (view, edit, share, filter)
- `filter` - Filter changes (hashtags, status, type, news categories)
- `engagement` - User engagement (scroll depth, time on page, external links)
- `error` - API and application errors
- `performance` - Performance metrics

### 🔍 Tracked Events

#### Dashboard Page
- Filter changes (hashtag, status, type)
- Pagination clicks
- Issue card views
- Issue edit actions
- Clear filters action
- API load/refresh errors

#### Issue Detail Page
- Issue view (with ID and type)
- Copy link (share tracking)
- Open in Google Maps
- Edit issue
- Image view
- Back to home navigation
- API load errors

#### Map Component
- Map marker clicks
- Filter changes
- Issue detail card views
- Back to latest issues
- Map zoom/pan interactions

#### News Feed
- Category filter changes
- News article views (modal open)
- News article clicks (external link)
- Load more clicks
- Modal close
- API errors

#### General Navigation
- Header logo clicks
- Join movement button clicks
- Form submissions

### 🛠️ Implementation Details

#### Core Files

1. **`/src/app/utils/analytics.ts`**
   - Core analytics utilities
   - Event tracking functions
   - User journey tracking class
   - Event categories and actions enums

2. **`/src/app/context/AnalyticsContext.tsx`**
   - React context provider for analytics
   - Automatic page view tracking
   - Session management

3. **`/src/app/hooks/useScrollTracking.ts`**
   - Hook for scroll depth tracking
   - Hook for time tracking

4. **`/src/app/hooks/useClickTracking.ts`**
   - Hook for click event tracking
   - Link tracking utilities

#### Integration Points

The analytics system is integrated into:
- Root layout (`layout.tsx`) - AnalyticsProvider wrapper
- Dashboard page - Full tracking of filters, pagination, and issue interactions
- Issue detail page - View tracking, share actions, map links
- Map component - Marker clicks, filter changes
- News feed - Article views, clicks, category filters
- Header/Footer - Navigation tracking
- Join page - Form submission tracking

### 📈 Custom Events

#### Tracking Issue Views
```typescript
trackIssueView(issueId, issueType);
```

#### Tracking Filters
```typescript
trackIssueFilter('hashtag', selectedValue);
trackIssueFilter('status', selectedValue);
trackIssueFilter('type', selectedValue);
```

#### Tracking Clicks
```typescript
const trackClick = useClickTracking();
trackClick('Button Name', EventCategory.USER_INTERACTION, {
  custom_param: 'value'
});
```

#### Tracking User Journey
```typescript
const { trackJourneyStep } = useAnalytics();
trackJourneyStep('step_name', { additional_data: 'value' });
```

#### Tracking Errors
```typescript
trackError('error_type', 'error_message', 'context');
```

### 🔐 Privacy & Data Collection

The implementation respects user privacy:
- No personal information is collected without consent
- All tracking uses Google Analytics standard practices
- External link tracking includes destination URLs only
- Error tracking includes error messages but not sensitive data

### 📊 Google Analytics Dashboard

To view the analytics data:

1. Go to [Google Analytics](https://analytics.google.com)
2. Select your property (ID: G-ZYDZM87HR8)
3. Navigate to Events section to see all custom events

#### Key Reports to Monitor

1. **Engagement > Events** - See all custom events
2. **Engagement > Pages and screens** - Page views and time on page
3. **User Attributes > Journey** - User journey tracking
4. **Reports > Realtime** - Live user activity

### 🎨 Event Naming Convention

Events follow this structure:
- **Action**: What happened (e.g., `click`, `view`, `filter_change`)
- **Category**: Type of interaction (e.g., `user_interaction`, `issue`)
- **Label**: Specific identifier (e.g., `Issue 123`, `hashtag: bengaluru`)
- **Custom Parameters**: Additional context (e.g., `issue_id`, `filter_type`)

### 🚀 Usage Examples

#### Adding Tracking to a New Button
```typescript
import { useClickTracking } from '../hooks/useClickTracking';
import { EventCategory } from '../utils/analytics';

function MyComponent() {
  const trackClick = useClickTracking();
  
  return (
    <button onClick={() => {
      trackClick('My Button', EventCategory.USER_INTERACTION, {
        button_location: 'header',
        button_type: 'primary'
      });
      // Your button logic here
    }}>
      Click Me
    </button>
  );
}
```

#### Adding Tracking to a New Page
```typescript
import { useScrollTracking, useTimeTracking } from '../hooks/useScrollTracking';

export default function MyPage() {
  // Automatic scroll and time tracking
  useScrollTracking();
  useTimeTracking('/my-page');
  
  return <div>My Page Content</div>;
}
```

#### Tracking Form Submissions
```typescript
import { trackEvent, EventCategory } from '../utils/analytics';

const handleSubmit = () => {
  trackEvent('form_submission', {
    event_category: EventCategory.ENGAGEMENT,
    event_label: 'Contact Form',
    form_id: 'contact_form'
  });
  // Submit logic
};
```

### 🐛 Debugging

To debug analytics in development:

1. Open browser DevTools
2. Go to Network tab and filter by "collect"
3. Check Console for "Analytics tracking error" messages
4. Use Google Analytics DebugView for real-time event validation

### ✅ Testing Checklist

Before deploying:
- [ ] Verify GA measurement ID is correct in layout.tsx
- [ ] Test page view tracking on route changes
- [ ] Test scroll depth tracking (scroll to bottom)
- [ ] Test click tracking on major buttons
- [ ] Test filter tracking
- [ ] Test error tracking (simulate API error)
- [ ] Verify events appear in GA Realtime view
- [ ] Check that user journey is recorded

### 📝 Notes

- All tracking is client-side using Google Analytics
- No additional configuration required - works with existing GA setup
- Events are throttled to prevent excessive tracking
- Scroll tracking uses passive listeners for performance
- Journey tracking persists in memory for the session duration

### 🔄 Future Enhancements

Consider adding:
- Conversion tracking for key actions
- A/B testing integration
- Enhanced e-commerce tracking
- User segmentation
- Custom dimensions for deeper analysis
- Heatmap integration
- Session recording

---

**Last Updated**: January 26, 2026  
**Version**: 1.0.0  
**Contact**: Development Team
