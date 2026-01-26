# Bengaluru News Feed API Documentation

## Overview
This document describes the backend API contract needed to power the Bengaluru News Feed feature. The frontend expects a RESTful API endpoint that returns news articles about Bengaluru filtered by civic issue categories.

---

## API Endpoint

### GET `/api/news/bengaluru`

Fetch news articles about Bengaluru filtered by issue categories.

---

## Request Parameters

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `category` | string | No | `ALL` | Filter by issue category. Allowed values: `ALL`, `POTHOLE`, `WASTE`, `FOOTPATH`, `POLLUTION`, `HYGIENE`, `SAFETY` |
| `page` | number | No | `1` | Page number for pagination (1-indexed) |
| `pageSize` | number | No | `10` | Number of articles per page (recommended: 6-20) |

### Example Requests

```bash
# Get all news (first page)
GET /api/news/bengaluru

# Get pothole-related news
GET /api/news/bengaluru?category=POTHOLE

# Get page 2 of waste-related news with 6 items per page
GET /api/news/bengaluru?category=WASTE&page=2&pageSize=6

# Get all news with custom pagination
GET /api/news/bengaluru?category=ALL&page=1&pageSize=12
```

---

## Response Format

### Success Response (200 OK)

```typescript
{
  "status": "success",
  "totalResults": number,      // Total number of articles matching filter
  "page": number,               // Current page number
  "pageSize": number,           // Number of items per page
  "articles": NewsArticle[]     // Array of news articles
}
```

### NewsArticle Object

```typescript
{
  "id": string,                 // Unique identifier for the article
  "title": string,              // Article headline
  "description": string,        // Short description/excerpt (2-3 sentences)
  "content": string,            // Full article content (optional)
  "category": string,           // One of: POTHOLE, WASTE, FOOTPATH, POLLUTION, HYGIENE, SAFETY
  "source": {
    "id": string | null,        // Source identifier (e.g., "the-hindu")
    "name": string              // Display name (e.g., "The Hindu")
  },
  "author": string,             // Article author name (optional)
  "url": string,                // Full URL to original article
  "urlToImage": string,         // URL to article's featured image (optional)
  "publishedAt": string,        // ISO 8601 date-time string (e.g., "2026-01-26T10:30:00Z")
  "location": "Bengaluru"       // Always "Bengaluru" for this endpoint
}
```

### Example Success Response

```json
{
  "status": "success",
  "totalResults": 45,
  "page": 1,
  "pageSize": 6,
  "articles": [
    {
      "id": "art_123456",
      "title": "BBMP to Fix 500 Potholes in Koramangala by Month-End",
      "description": "Bengaluru civic body announces massive pothole filling drive across major roads in Koramangala area. The initiative aims to improve road safety before the monsoon season.",
      "content": "Full article content here...",
      "category": "POTHOLE",
      "source": {
        "id": "the-hindu",
        "name": "The Hindu"
      },
      "author": "Staff Reporter",
      "url": "https://thehindu.com/news/cities/bangalore/article123456",
      "urlToImage": "https://example.com/image.jpg",
      "publishedAt": "2026-01-26T10:30:00Z",
      "location": "Bengaluru"
    },
    {
      "id": "art_123457",
      "title": "Indiranagar Residents Launch Community Waste Segregation Drive",
      "description": "Local residents in Indiranagar have started a community-led initiative to improve waste segregation and recycling, aiming to reduce landfill burden.",
      "content": "Full article content here...",
      "category": "WASTE",
      "source": {
        "id": "deccan-herald",
        "name": "Deccan Herald"
      },
      "author": "Priya Sharma",
      "url": "https://deccanherald.com/bangalore/waste-management-initiative",
      "urlToImage": "https://example.com/waste-image.jpg",
      "publishedAt": "2026-01-25T14:20:00Z",
      "location": "Bengaluru"
    }
  ]
}
```

---

### Error Response (4xx/5xx)

```typescript
{
  "status": "error",
  "message": string,            // Human-readable error message
  "code": string                // Error code (optional)
}
```

### Example Error Responses

```json
// Invalid category
{
  "status": "error",
  "message": "Invalid category. Allowed values: ALL, POTHOLE, WASTE, FOOTPATH, POLLUTION, HYGIENE, SAFETY",
  "code": "INVALID_CATEGORY"
}

// API rate limit exceeded
{
  "status": "error",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED"
}

// Service unavailable
{
  "status": "error",
  "message": "News service temporarily unavailable. Please try again later.",
  "code": "SERVICE_UNAVAILABLE"
}
```

---

## Implementation Guidelines

### 1. Data Source Integration

The backend should integrate with NewsAPI or similar service:

**NewsAPI Example:**
```javascript
const newsApiParams = {
  q: `Bengaluru OR Bangalore AND (${getCategoryKeywords(category)})`,
  language: 'en',
  sortBy: 'publishedAt',
  page: page,
  pageSize: pageSize,
  apiKey: process.env.NEWS_API_KEY
};

const response = await fetch(
  `https://newsapi.org/v2/everything?${new URLSearchParams(newsApiParams)}`
);
```

### 2. Category Keyword Mapping

```javascript
function getCategoryKeywords(category) {
  const keywords = {
    POTHOLE: 'pothole OR "road repair" OR "bad roads" OR "road damage"',
    WASTE: 'waste OR garbage OR "solid waste" OR trash OR "waste management"',
    FOOTPATH: 'footpath OR sidewalk OR pedestrian OR "pedestrian infrastructure"',
    POLLUTION: 'pollution OR "air quality" OR smog OR emissions',
    HYGIENE: 'hygiene OR sanitation OR cleanliness OR "public health"',
    SAFETY: 'safety OR crime OR "street lighting" OR security',
    ALL: 'pothole OR waste OR footpath OR pollution OR hygiene OR safety'
  };
  return keywords[category] || keywords.ALL;
}
```

### 3. Article Categorization Logic

The backend should categorize articles by analyzing:
- Article title and description
- Keyword matches
- Content analysis

```javascript
function categorizeArticle(article) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  
  if (text.includes('pothole') || text.includes('road repair')) return 'POTHOLE';
  if (text.includes('waste') || text.includes('garbage')) return 'WASTE';
  if (text.includes('footpath') || text.includes('sidewalk')) return 'FOOTPATH';
  if (text.includes('pollution') || text.includes('air quality')) return 'POLLUTION';
  if (text.includes('hygiene') || text.includes('sanitation')) return 'HYGIENE';
  if (text.includes('safety') || text.includes('crime')) return 'SAFETY';
  
  return 'POTHOLE'; // Default fallback
}
```

### 4. Location Filtering

Ensure all articles are related to Bengaluru:
```javascript
const query = '(Bengaluru OR Bangalore) AND (civic issues OR infrastructure)';
```

### 5. Response Transformation

Transform NewsAPI response to match our contract:
```javascript
function transformNewsApiResponse(newsApiData) {
  return {
    status: 'success',
    totalResults: newsApiData.totalResults,
    page: newsApiData.page,
    pageSize: newsApiData.articles.length,
    articles: newsApiData.articles.map(article => ({
      id: generateUniqueId(), // Generate unique ID
      title: article.title,
      description: article.description,
      content: article.content,
      category: categorizeArticle(article),
      source: article.source,
      author: article.author,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      location: 'Bengaluru'
    }))
  };
}
```

---

## Rate Limiting & Caching

### Recommended Strategy

1. **Cache responses** for 15-30 minutes to reduce API calls
2. **Rate limit** client requests to 100 requests/hour per IP
3. **Use server-side caching** (Redis/Memcached) for frequently accessed categories
4. **Implement request throttling** during high traffic

### Cache Headers
```http
Cache-Control: public, max-age=900
ETag: "abc123"
```

---

## Security Considerations

1. **API Key Protection**: Never expose NewsAPI key to frontend
2. **CORS Configuration**: Only allow requests from your frontend domain
3. **Input Validation**: Sanitize and validate all query parameters
4. **Rate Limiting**: Prevent abuse with request limits
5. **Error Handling**: Don't expose internal error details to clients

---

## Testing the API

### cURL Examples

```bash
# Test basic endpoint
curl -X GET "http://localhost:3000/api/news/bengaluru"

# Test with category filter
curl -X GET "http://localhost:3000/api/news/bengaluru?category=POTHOLE"

# Test pagination
curl -X GET "http://localhost:3000/api/news/bengaluru?page=2&pageSize=6"

# Test error handling
curl -X GET "http://localhost:3000/api/news/bengaluru?category=INVALID"
```

### Expected Response Times

- **Cached response**: < 50ms
- **Fresh API call**: 200-500ms
- **Timeout threshold**: 5 seconds

---

## Frontend Integration

The frontend is already configured to consume this API. Once you implement the endpoint, update this line in `/src/app/api/newsService.ts`:

```typescript
// Replace mock data call with actual API call
export async function fetchBengaluruNews(category, page, pageSize) {
  const response = await fetch(
    `/api/news/bengaluru?category=${category}&page=${page}&pageSize=${pageSize}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch news');
  }
  
  return await response.json();
}
```

---

## Monitoring & Logging

### Recommended Metrics

- Request count per category
- Average response time
- Error rate
- Cache hit/miss ratio
- NewsAPI quota usage

### Log Format
```json
{
  "timestamp": "2026-01-26T10:30:00Z",
  "endpoint": "/api/news/bengaluru",
  "category": "POTHOLE",
  "page": 1,
  "responseTime": 234,
  "status": "success",
  "articlesReturned": 6
}
```

---

## Contact & Support

For questions or issues with this API integration, contact:
- **Frontend Team**: [Your contact]
- **API Documentation**: This file
- **NewsAPI Docs**: https://newsapi.org/docs

---

**Version**: 1.0  
**Last Updated**: January 26, 2026  
**Status**: Ready for Implementation
