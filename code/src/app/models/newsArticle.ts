/**
 * News Article Models
 * These interfaces define the structure of news data from the backend API
 */

export type IssueCategory = 'POTHOLE' | 'WASTE' | 'FOOTPATH' | 'POLLUTION' | 'HYGIENE' | 'SAFETY';

export interface NewsSource {
  id: string | null;
  name: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  category: IssueCategory;
  source: NewsSource;
  author?: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  location: 'Bengaluru';
}

export interface NewsApiResponse {
  status: 'success' | 'error';
  totalResults: number;
  page: number;
  pageSize: number;
  articles: NewsArticle[];
}

export interface ErrorResponse {
  status: 'error';
  message: string;
  code?: string;
}
