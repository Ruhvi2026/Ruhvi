import React from 'react';
import { renderToString } from 'react-dom/server';
import { OfflineDetector } from '../components/layout/OfflineDetector';

describe('OfflineDetector Banner (Finding E4 & 27)', () => {
  it('renders null during SSR/initial render when online', () => {
    const html = renderToString(React.createElement(OfflineDetector));
    expect(html).toBe('');
  });
});
