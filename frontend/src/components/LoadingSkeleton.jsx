import React from 'react';

const Skeleton = ({ width, height, borderRadius = '8px', style }) => (
  <div className="skeleton-pulse" style={{ width: width || '100%', height: height || '16px', borderRadius, ...style }} />
);

export const SkeletonCard = ({ count = 6 }) => (
  <div className="grid-cards">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card-item skeleton-card">
        <Skeleton width="70%" height="16px" style={{ margin: '0 auto 10px' }} />
        <Skeleton width="50%" height="12px" />
      </div>
    ))}
  </div>
);

export const SkeletonQuizItem = ({ count = 5 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="quiz-card-item skeleton-quiz-item">
        <Skeleton width="60px" height="12px" style={{ marginBottom: '8px' }} />
        <Skeleton width="90%" height="16px" style={{ marginBottom: '6px' }} />
        <Skeleton width="70%" height="14px" style={{ marginBottom: '12px' }} />
        <Skeleton width="120px" height="36px" borderRadius="9999px" />
      </div>
    ))}
  </>
);

export const SkeletonFilters = ({ count = 3 }) => (
  <div className="filters-row">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} width="160px" height="42px" borderRadius="10px" />
    ))}
  </div>
);

export const SkeletonModuleGrid = ({ count = 6 }) => (
  <div className="grid-cards">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card-item skeleton-card">
        <Skeleton width="75%" height="16px" style={{ margin: '0 auto 10px' }} />
        <Skeleton width="55%" height="12px" />
      </div>
    ))}
  </div>
);

export default Skeleton;
