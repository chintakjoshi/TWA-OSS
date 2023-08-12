import React from 'react';
import { render, act } from "@testing-library/react";
import Apply from './components/apply';
import Dashboard from './components/Dashboard';
import Landing from './components/Landing';
import Login from './components/Login';
import MyProfile from './components/MyProfile';
import Navbar from './components/Navbar'; 
import Register from './components/Register';
import Search from './components/Search';
import UserFunctions from './components/UserFunctions';

describe('Apply Component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<Apply />);
    });
  });

describe('Dashboard Component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<Dashboard />);
    });
  });


test('updates state when password is entered', () => {
    const { getByPlaceholderText } = render(<Login />);
    const input = getByPlaceholderText('Enter password');
    fireEvent.change(input, { target: { value: 'password123' } });
    expect(input.value).toBe('password123');

describe('Landing Component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<Landing />);
    });
  });
});

describe('Login component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<Login />);
    });
  });
});

describe('MyProfile Component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<MyProfile />);
    });
  });
});

describe('Navbar Component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<Navbar />);
    });
  });
});



describe('Search component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<Search />);
    });
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


describe('UserFunctions component', () => {
  test('renders without crashing', () => {
    act(() => {
      render(<UserFunctions />);
    });
  });
});

