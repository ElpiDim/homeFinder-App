import { render, screen } from '@testing-library/react';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

// Mock matchMedia for tests
window.matchMedia = window.matchMedia || function() {
    return {
        matches: false,
        addListener: function() {},
        removeListener: function() {}
    };
};

test('renders welcome message on home page', () => {
  render(
    <MemoryRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
  const headingElement = screen.getByText(/Find a house, make it your home in a click./i);
  expect(headingElement).toBeInTheDocument();
});
