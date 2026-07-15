import React from 'react';

const PageHeader = ({ title, subtitle, right, className = 'dash-topbar' }) => {
  return (
    <header className={className}>
      <div className="page-header-main">
        {title && <h1 className="page-header-title">{title}</h1>}
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {right && <div className="page-header-actions">{right}</div>}
    </header>
  );
};

export default PageHeader;
