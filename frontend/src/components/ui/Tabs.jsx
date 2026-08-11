import React from 'react';

export default function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{ marginLeft: 6, fontSize: '0.75rem', opacity: 0.7 }}>({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
