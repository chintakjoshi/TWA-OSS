import React, { Component } from 'react';
import { Link, withRouter } from 'react-router-dom';
import styled from 'styled-components';

// Styles for the Navbar component
const Navbar = styled.nav`
  background-color: black;
  padding: 0.5rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  .navbar-brand {
    color: #fff;
    font-size: 1.5rem;
  }
  .navbar-nav .nav-link {
    color: #ddd;
    &:hover {
      color: #fff;
    }
  }
  .navbar-nav .nav-item.active .nav-link {
    color: black;
    background-color: white;
  }
`;

class Landing extends Component {
  logOut(e) {
    e.preventDefault();
    localStorage.removeItem('usertoken');
    this.props.history.push(`/`);
  }

  render() {
    const { location: { pathname } } = this.props;

    const loginRegLink = (
      <ul className="navbar-nav">
        <li className={`nav-item ${pathname === '/login' ? 'active' : ''}`}>
          <Link to="/login" className="nav-link">
            Admin Login
          </Link>
        </li>
      </ul>
    )
    
    const userLink = (
      <ul className="navbar-nav">
        <li className={`nav-item ${pathname === '/Dashboard' ? 'active' : ''}`}>
          <Link to="/Dashboard" className="nav-link">
            Dashboard
          </Link>
        </li>
        <li className={`nav-item ${pathname === '/MyProfile' ? 'active' : ''}`}>
          <Link to="/MyProfile" className="nav-link">
            My Profile
          </Link>
        </li>
        <li className={`nav-item ${pathname === '/register' ? 'active' : ''}`}>
          <Link to="/register" className="nav-link">
            Register Admin
          </Link>
        </li>
        <li className="nav-item">
          <a href="" onClick={this.logOut.bind(this)} className="nav-link">
            Logout
          </a>
        </li>
      </ul>
    )    

    return (
      <Navbar className="navbar navbar-expand-lg">
        <Link to="/" className={`navbar-brand ${pathname === '/' ? 'active' : ''}`}>
          TWA
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarsExample10"
          aria-controls="navbarsExample10"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div
          className="collapse navbar-collapse justify-content-md-center"
          id="navbarsExample10"
        >
          {localStorage.usertoken ? userLink : loginRegLink}
        </div>
      </Navbar>
    )
  }
}

export default withRouter(Landing);