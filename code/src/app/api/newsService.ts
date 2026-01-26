/**
 * News Service
 * Handles fetching news articles about Bengaluru
 */

import { NewsApiResponse, IssueCategory } from '../models/newsArticle';

/**
 * Fetch news articles from the backend
 * 
 * @param category - Filter by issue category (optional)
 * @param page - Page number (default: 1)
 * @param pageSize - Number of articles per page (default: 10)
 * @returns Promise with news articles
 */
export async function fetchBengaluruNews(
  category: IssueCategory | 'ALL' = 'ALL',
  page: number = 1,
  pageSize: number = 10
): Promise<NewsApiResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (category !== 'ALL') {
    params.set('category', category);
  }

  const response = await fetch(`https://staging.api.smalltech.in/local/api/news/%23bengaluru?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    cache: 'no-store',
    credentials: 'include'
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Failed to fetch news (status ${response.status})${errorText ? `: ${errorText}` : ''}`);
  }

  const data: NewsApiResponse = await response.json();
  return data;
}

/**
 * Get category badge color
 */
export function getCategoryColor(category: IssueCategory): string {
  const colors: Record<IssueCategory, string> = {
    POTHOLE: '#FF6B6B',
    WASTE: '#4ECDC4',
    FOOTPATH: '#FFD93D',
    POLLUTION: '#95E1D3',
    HYGIENE: '#F38181',
    SAFETY: '#AA96DA'
  };
  return colors[category];
}

/**
 * Format date for display
 */
export function formatNewsDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInHours < 48) return 'Yesterday';
  if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
  
  return date.toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });
}
