import React from 'react';
import { NewsArticle, IssueCategory } from '../../models/newsArticle';
import { formatNewsDate } from '../../api/newsService';
import './newsCard.css';

interface NewsCardProps {
  article: NewsArticle;
  onOpen: (article: NewsArticle) => void;
}

export default function NewsCard({ article, onOpen }: NewsCardProps) {
  const formattedDate = formatNewsDate(article.publishedAt);

  const getCategoryLabel = (category: IssueCategory) => {
    const labels: Record<IssueCategory, string> = {
      POTHOLE: '🕳️ Pothole',
      WASTE: '🗑️ Waste',
      FOOTPATH: '🚶 Footpath',
      POLLUTION: '🌫️ Pollution',
      HYGIENE: '🧼 Hygiene',
      SAFETY: '🛡️ Safety'
    };
    return labels[category] ?? category;
  };

  const handleClick = () => {
    onOpen(article);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(article);
    }
  };

  const sourceInitial = article.source.name.charAt(0).toUpperCase();

  return (
    <article 
      className="news-card" 
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Open article: ${article.title}`}
    >
      {article.urlToImage && (
        <img 
          src={article.urlToImage} 
          alt={article.title}
          className="news-card-image"
          loading="lazy"
        />
      )}
      
      <div className="news-card-content">
        <div className="news-card-header">
          <span 
            className="news-card-category"
          >
            {getCategoryLabel(article.category)}
          </span>
          <span className="news-card-date">{formattedDate}</span>
        </div>

        <h3 className="news-card-title">{article.title}</h3>
        
        <p className="news-card-description">{article.description}</p>

        <div className="news-card-footer">
          <div className="news-card-source">
            <div className="news-card-source-icon">{sourceInitial}</div>
            <span className="news-card-source-name">{article.source.name}</span>
          </div>
          <span className="news-card-read-more">Read More</span>
        </div>
      </div>
    </article>
  );
}
