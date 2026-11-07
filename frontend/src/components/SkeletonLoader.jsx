import React from 'react';

/**
 * Card skeleton loader component for doctor and hospital grid listings.
 */
export const SkeletonCard = () => (
  <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
    <div className="skeleton" style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-md, 12px)' }} />
    <div className="flex items-center justify-between">
      <div className="skeleton" style={{ width: '35%', height: '20px' }} />
      <div className="skeleton" style={{ width: '20%', height: '20px' }} />
    </div>
    <div className="skeleton" style={{ width: '70%', height: '24px' }} />
    <div className="skeleton" style={{ width: '90%', height: '16px' }} />
    <div className="skeleton" style={{ width: '50%', height: '16px' }} />
    <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      <div className="skeleton" style={{ height: '36px', borderRadius: 'var(--radius-md, 12px)' }} />
      <div className="skeleton" style={{ height: '36px', borderRadius: 'var(--radius-md, 12px)' }} />
    </div>
  </div>
);

/**
 * Grid of card skeletons matching responsive auto-fill layout.
 */
export const SkeletonGrid = ({ count = 6 }) => {
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

/**
 * Table row skeleton loader for administrative and patient management tables.
 */
export const SkeletonTableRow = ({ cols = 5 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} style={{ padding: '0.85rem 1rem' }}>
        <div 
          className="skeleton" 
          style={{ 
            height: '18px', 
            width: i === 0 ? '40%' : i === cols - 1 ? '60px' : '75%',
            borderRadius: '4px' 
          }} 
        />
      </td>
    ))}
  </tr>
);

/**
 * Multi-row table skeleton for loading state encapsulation.
 */
export const SkeletonTable = ({ rows = 5, cols = 5 }) => (
  <tbody>
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonTableRow key={i} cols={cols} />
    ))}
  </tbody>
);

/**
 * Detail view skeleton loader for Doctor and Hospital detail screens.
 */
export const SkeletonDetails = () => (
  <div className="container" style={{ padding: '2rem 1.25rem' }}>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="skeleton" style={{ height: '280px', borderRadius: 'var(--radius-lg, 16px)' }} />
        <div className="skeleton" style={{ height: '36px', width: '50%' }} />
        <div className="skeleton" style={{ height: '20px', width: '30%' }} />
        <div className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-md, 12px)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton" style={{ height: '350px', borderRadius: 'var(--radius-lg, 16px)' }} />
      </div>
    </div>
  </div>
);

const SkeletonLoader = {
  Card: SkeletonCard,
  Grid: SkeletonGrid,
  TableRow: SkeletonTableRow,
  Table: SkeletonTable,
  Details: SkeletonDetails,
};

export default SkeletonLoader;
