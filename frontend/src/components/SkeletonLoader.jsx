import React from 'react';

export const SkeletonCard = () => (
  <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
    <div className="skeleton" style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md)' }} />
    <div className="flex items-center justify-between">
      <div className="skeleton" style={{ width: '35%', height: '20px' }} />
      <div className="skeleton" style={{ width: '20%', height: '20px' }} />
    </div>
    <div className="skeleton" style={{ width: '70%', height: '24px' }} />
    <div className="skeleton" style={{ width: '90%', height: '16px' }} />
    <div className="skeleton" style={{ width: '50%', height: '16px' }} />
    <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      <div className="skeleton" style={{ height: '36px', borderRadius: 'var(--radius-md)' }} />
      <div className="skeleton" style={{ height: '36px', borderRadius: 'var(--radius-md)' }} />
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 6, cols = 3 }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`,
      gap: '1.5rem',
      width: '100%'
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};
