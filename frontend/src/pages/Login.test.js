
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

// Mock AuthContext
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn().mockResolvedValue({ user: { name: 'Test User', role: 'owner' }, token: 'fake-token' }),
    setUser: jest.fn(),
  }),
}));

test('renders login page with new design elements', () => {
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

  // Check for the "Log in to Your Account" text
  expect(screen.getByText('Log in to Your Account')).toBeInTheDocument();

  // Check for the "Welcome back!" text
  expect(screen.getByText('Welcome back! Please enter your details.')).toBeInTheDocument();

  // Check for Email input
  expect(screen.getByPlaceholderText('Enter your email or username')).toBeInTheDocument();

  // Check for Password input
  expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();

  // Check for "Log In" button
  expect(screen.getByText('Log In')).toBeInTheDocument();

  // Check for "Sign Up" link
  expect(screen.getByText('Sign Up')).toBeInTheDocument();

  // Check for DreamHome branding
  expect(screen.getAllByText('DreamHome')).toHaveLength(2); // One in sidebar, one in mobile header
});
