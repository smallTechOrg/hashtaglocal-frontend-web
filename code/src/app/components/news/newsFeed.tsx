'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { IssueCategory, NewsArticle, NewsApiResponse } from '../../models/newsArticle';
import { fetchBengaluruNews, getCategoryColor, formatNewsDate } from '../../api/newsService';
import NewsCard from './newsCard';
import './newsFeed.css';

type FilterCategory = IssueCategory | 'ALL';

const CATEGORIES: { value: FilterCategory; label: string }[] = [
  { value: 'ALL', label: '🌐 All News' },
  { value: 'POTHOLE', label: '🕳️ Potholes' },
  { value: 'WASTE', label: '🗑️ Waste' },
  { value: 'FOOTPATH', label: '🚶 Footpaths' },
  { value: 'POLLUTION', label: '🌫️ Pollution' },
  { value: 'HYGIENE', label: '🧼 Hygiene' },
  { value: 'SAFETY', label: '🛡️ Safety' }
];

export default function NewsFeed() {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');
  const [newsData, setNewsData] = useState<NewsApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);

  const loadNews = async (category: FilterCategory, page: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchBengaluruNews(category, page, 6);
      
      if (page === 1) {
        setNewsData(data);
      } else {
        // Append to existing articles for "Load More"
        setNewsData((prev) => {
          if (!prev) return data;
          return {
            ...data,
            articles: [...prev.articles, ...data.articles]
          };
        });
      }
    } catch (err) {
      setError('Failed to load news. Please try again later.');
      console.error('Error fetching news:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadNews(selectedCategory, 1);
  }, [selectedCategory]);

  useEffect(() => {
    if (activeArticle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activeArticle]);

  const handleCategoryChange = (category: FilterCategory) => {
    setSelectedCategory(category);
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadNews(selectedCategory, nextPage);
  };

  const handleOpenArticle = (article: NewsArticle) => {
    setActiveArticle(article);
  };

  const handleCloseModal = () => {
    setActiveArticle(null);
  };

  const hasMoreArticles = newsData && newsData.articles.length < newsData.totalResults;

  return (
    <section className="news-feed">
      <div className="news-feed-container">
        {/* Header */}
        <div className="news-feed-header">
          <h2 className="news-feed-title text-walnut">News</h2>
        </div>

        {/* Category Filters */}
        <div className="news-feed-filters">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              className={`filter-button ${selectedCategory === category.value ? 'active' : ''}`}
              onClick={() => handleCategoryChange(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && currentPage === 1 && (
          <div className="news-feed-loading">
            <div className="loading-spinner"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="news-feed-error">
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && newsData && newsData.articles.length === 0 && (
          <div className="news-feed-empty">
            <h3>No news found</h3>
            <p>There are no articles available for this category at the moment.</p>
          </div>
        )}

        {/* News Grid */}
        {!isLoading && newsData && newsData.articles.length > 0 && (
          <>
            <div className="news-feed-grid">
              {newsData.articles.map((article: NewsArticle) => (
                <NewsCard key={article.id} article={article} onOpen={handleOpenArticle} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreArticles && (
              <div className="news-feed-load-more">
                <button 
                  className="load-more-button"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {activeArticle && (
        <div className="news-modal-backdrop" onClick={handleCloseModal} role="dialog" aria-modal="true">
          <div className="news-modal" onClick={(e) => e.stopPropagation()}>
            <button className="news-modal-close" onClick={handleCloseModal} aria-label="Close article">
              X
            </button>

            {activeArticle.urlToImage && (
              <div className="news-modal-image-wrapper">
                <Image 
                  src={activeArticle.urlToImage}
                  alt={activeArticle.title}
                  fill
                  className="news-modal-image"
                  sizes="100vw"
                  priority={false}
                />
              </div>
            )}

            <div className="news-modal-body">
              <div className="news-modal-meta">
                <span className="news-modal-category" style={{ backgroundColor: getCategoryColor(activeArticle.category) }}>
                  {activeArticle.category}
                </span>
                <span className="news-modal-date">{formatNewsDate(activeArticle.publishedAt)}</span>
              </div>

              <h3 className="news-modal-title">{activeArticle.title}</h3>

              <div className="news-modal-source">
                <span className="news-modal-source-dot" />
                <span className="news-modal-source-name">{activeArticle.source.name}</span>
              </div>

              <p className="news-modal-description">{activeArticle.description}</p>

              {activeArticle.content && (
                <p className="news-modal-content">{activeArticle.content}</p>
              )}

              <div className="news-modal-frame">
                <iframe
                  src={activeArticle.url}
                  title={activeArticle.title}
                  loading="lazy"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <p className="news-modal-frame-note">If this page does not load, use the original link below.</p>
              </div>

              <div className="news-modal-actions">
                <a 
                  href={activeArticle.url}
                  target="_blank"
                  rel="noreferrer"
                  className="news-modal-link"
                >
                  Open original article
                </a>
                <button className="news-modal-secondary" onClick={handleCloseModal}>
                  Close and continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
