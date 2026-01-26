/**
 * News Service
 * Handles fetching news articles about Bengaluru
 * Currently uses mock data - ready to connect to backend API
 */

import { NewsApiResponse, NewsArticle, IssueCategory } from '../models/newsArticle';

// Mock data for development
const MOCK_NEWS_ARTICLES: NewsArticle[] = [
  {
    id: 'news_001',
    title: 'BBMP to Fix 500 Potholes in Koramangala by Month-End',
    description: 'Bengaluru civic body announces massive pothole filling drive across major roads in Koramangala area. The initiative aims to improve road safety before the monsoon season.',
    content: 'The Bruhat Bengaluru Mahanagara Palike (BBMP) has announced an ambitious plan to repair over 500 potholes in the Koramangala area by the end of this month...',
    category: 'POTHOLE',
    source: {
      id: 'the-hindu',
      name: 'The Hindu'
    },
    author: 'Staff Reporter',
    url: 'https://thehindu.com/news/cities/bangalore/article123456',
    urlToImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    publishedAt: '2026-01-26T10:30:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_002',
    title: 'Indiranagar Residents Launch Community Waste Segregation Drive',
    description: 'Local residents in Indiranagar have started a community-led initiative to improve waste segregation and recycling, aiming to reduce landfill burden.',
    content: 'A group of environmentally conscious residents in Indiranagar have come together to launch a comprehensive waste management program...',
    category: 'WASTE',
    source: {
      id: 'deccan-herald',
      name: 'Deccan Herald'
    },
    author: 'Priya Sharma',
    url: 'https://deccanherald.com/bangalore/waste-management-initiative',
    urlToImage: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800',
    publishedAt: '2026-01-25T14:20:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_003',
    title: 'New Footpaths to Be Constructed Along ORR Service Roads',
    description: 'BBMP approves Rs 50 crore project to build pedestrian-friendly footpaths along Outer Ring Road service roads, improving walkability and safety.',
    content: 'The Bengaluru civic body has greenlit a significant infrastructure project aimed at making the city more pedestrian-friendly...',
    category: 'FOOTPATH',
    source: {
      id: 'times-of-india',
      name: 'Times of India'
    },
    author: 'Rakesh Kumar',
    url: 'https://timesofindia.com/city/bengaluru/footpath-project',
    urlToImage: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800',
    publishedAt: '2026-01-25T09:15:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_004',
    title: 'Air Quality Index Improves in Major Areas After Green Initiative',
    description: 'Bengaluru sees 15% improvement in air quality following massive tree plantation drive and stricter vehicle emission norms implemented last quarter.',
    content: 'The Karnataka State Pollution Control Board has reported encouraging data showing improvement in air quality across several neighborhoods...',
    category: 'POLLUTION',
    source: {
      id: 'indian-express',
      name: 'Indian Express'
    },
    author: 'Anjali Menon',
    url: 'https://indianexpress.com/article/bangalore-pollution',
    urlToImage: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800',
    publishedAt: '2026-01-24T16:45:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_005',
    title: 'BBMP Launches Surprise Hygiene Inspections at Markets',
    description: 'Civic officials conduct unannounced checks at major markets in Malleswaram and Jayanagar to ensure food safety and cleanliness standards are maintained.',
    content: 'In a bid to improve public health standards, BBMP health officials have started conducting surprise hygiene inspections...',
    category: 'HYGIENE',
    source: {
      id: 'the-hindu',
      name: 'The Hindu'
    },
    author: 'Deepa Krishnan',
    url: 'https://thehindu.com/news/cities/bangalore/hygiene-inspections',
    urlToImage: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800',
    publishedAt: '2026-01-24T11:30:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_006',
    title: 'Street Lighting Upgraded in 20 Dark Spots Across City',
    description: 'BESCOM completes installation of LED street lights in areas identified as safety concerns, including Whitefield and HSR Layout neighborhoods.',
    content: 'The Bangalore Electricity Supply Company has successfully upgraded street lighting in 20 previously dark locations...',
    category: 'SAFETY',
    source: {
      id: 'deccan-herald',
      name: 'Deccan Herald'
    },
    author: 'Suresh Reddy',
    url: 'https://deccanherald.com/bangalore/street-lighting-safety',
    urlToImage: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800',
    publishedAt: '2026-01-23T18:00:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_007',
    title: 'Citizens Report 200+ Potholes Through Mobile App in One Week',
    description: 'BBMP\'s citizen engagement app sees surge in pothole complaints as residents actively participate in identifying road hazards across the city.',
    content: 'Digital engagement with civic issues has reached new heights as Bengaluru residents use technology to report infrastructure problems...',
    category: 'POTHOLE',
    source: {
      id: 'times-of-india',
      name: 'Times of India'
    },
    author: 'Kavita Rao',
    url: 'https://timesofindia.com/city/bengaluru/pothole-app',
    urlToImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
    publishedAt: '2026-01-23T12:20:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_008',
    title: 'Zero Waste Initiative Launched in JP Nagar Ward',
    description: 'JP Nagar becomes the first ward in Bengaluru to implement a comprehensive zero-waste program, targeting 100% waste segregation at source.',
    content: 'Setting an example for other wards, JP Nagar has embarked on an ambitious journey to achieve zero waste status...',
    category: 'WASTE',
    source: {
      id: 'indian-express',
      name: 'Indian Express'
    },
    author: 'Meera Iyer',
    url: 'https://indianexpress.com/article/bangalore-zero-waste',
    urlToImage: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
    publishedAt: '2026-01-22T15:30:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_009',
    title: 'Pedestrian Safety Audit Conducted on MG Road',
    description: 'Traffic police and urban planners assess pedestrian infrastructure on MG Road, identifying areas for improvement in footpath design and crossings.',
    content: 'A comprehensive pedestrian safety audit has been conducted on one of Bengaluru\'s busiest commercial streets...',
    category: 'FOOTPATH',
    source: {
      id: 'the-hindu',
      name: 'The Hindu'
    },
    author: 'Arjun Patel',
    url: 'https://thehindu.com/news/cities/bangalore/pedestrian-audit',
    urlToImage: 'https://images.unsplash.com/photo-1545558014-8692077e9b5c?w=800',
    publishedAt: '2026-01-22T10:00:00Z',
    location: 'Bengaluru'
  },
  {
    id: 'news_010',
    title: 'Vehicle-Free Sundays Extended to More Areas',
    description: 'Following success in Cubbon Park area, Bengaluru extends vehicle-free Sundays to Church Street and Brigade Road to reduce pollution and promote cycling.',
    content: 'The popular vehicle-free Sunday initiative is expanding to cover more of Bengaluru\'s central areas...',
    category: 'POLLUTION',
    source: {
      id: 'deccan-herald',
      name: 'Deccan Herald'
    },
    author: 'Sanjay Gupta',
    url: 'https://deccanherald.com/bangalore/vehicle-free-sundays',
    urlToImage: 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800',
    publishedAt: '2026-01-21T14:45:00Z',
    location: 'Bengaluru'
  }
];

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
  // TODO: Replace with actual API call when backend is ready
  // const response = await fetch(`/api/news/bengaluru?category=${category}&page=${page}&pageSize=${pageSize}`);
  // const data = await response.json();
  // return data;

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Filter by category if specified
  let filteredArticles = MOCK_NEWS_ARTICLES;
  if (category !== 'ALL') {
    filteredArticles = MOCK_NEWS_ARTICLES.filter(article => article.category === category);
  }

  // Paginate results
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedArticles = filteredArticles.slice(startIndex, endIndex);

  return {
    status: 'success',
    totalResults: filteredArticles.length,
    page,
    pageSize,
    articles: paginatedArticles
  };
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
