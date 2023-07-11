import React from 'react';
import { render, fireEvent } from "@testing-library/react";
import Login from './components/Login'; 
import Register from './components/Register';

describe('Login component', () => {
  test('renders without crashing', () => {
    render(<Login />);
  });

  test('updates state when email is entered', () => {
    const { getByPlaceholderText } = render(<Login />);
    const input = getByPlaceholderText('Enter email');
    fireEvent.change(input, { target: { value: 'test@test.com' } });
    expect(input.value).toBe('test@test.com');
  });
});

describe('Register component', () => {
  test('renders without crashing', () => {
    render(<Register />);
  });

  test('updates state when first name is entered', () => {
    const { getByPlaceholderText } = render(<Register />);
    const input = getByPlaceholderText('Enter your first name');
    fireEvent.change(input, { target: { value: 'John' } });
    expect(input.value).toBe('John');
  });

describe('MyComponent', () => {
  test('renders without crashing', () => {
    render(<MyComponent />);
  });

  test('updates state when button is clicked', () => {
    const { getByText } = render(<MyComponent />);
    const button = getByText('Click me');
    fireEvent.click(button);
    expect(button.textContent).toBe('Clicked');
  });

  test('updates state when password is entered', () => {
    const { getByPlaceholderText } = render(<Login />);
    const input = getByPlaceholderText('Enter password');
    fireEvent.change(input, { target: { value: 'password123' } });
    expect(input.value).toBe('password123');
  });

  test('updates state when last name is entered', () => {
    const { getByPlaceholderText } = render(<Register />);
    const input = getByPlaceholderText('Enter your last name');
    fireEvent.change(input, { target: { value: 'Doe' } });
    expect(input.value).toBe('Doe');
  });
});
