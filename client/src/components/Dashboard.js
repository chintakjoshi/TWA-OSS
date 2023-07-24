import React, { Component } from 'react'
import jwt_decode from 'jwt-decode'
import Search from './Search'
import '../componentstyles/Dashboard.css'

class Dashboard extends Component {
  constructor() {
    super()
    this.state = {
      first_name: '',
      last_name: '',
      Email: '',
      Phone: '',
      Gender: '',
      Date: '',
      referrer: '',
      job_type: '',
      errors: {},
      apply: [],
      searchQuery: '',
      filterBy: 'JobID',  // Default filter
      isLoading: false    // Add isLoading state
    }
  }

  componentDidMount() {
    const token = localStorage.usertoken
    const decoded = jwt_decode(token)
    this.setState({
      first_name: decoded.first_name,
      last_name: decoded.last_name,
      Email: decoded.Email
    })

    this.setState({ isLoading: true });  // Set isLoading to true when fetch starts

    fetch('/Users/apply')
    .then(res => res.json())
    .then(apply => this.setState({ apply, isLoading: false }))  // Set isLoading to false when fetch completes
    .catch(error => console.error('Error:', error));
  }

  filterApplications = () => {
    const { apply, searchQuery, filterBy } = this.state;
    if (!searchQuery) {
      return apply;
    }
    
    const lowercasedQuery = searchQuery.toLowerCase();

    return apply.filter(application =>
      application[filterBy].toLowerCase().includes(lowercasedQuery)
    );
  }

  handleFilterChange = (e) => {
    this.setState({
      filterBy: e.target.value
    });
  }

  render() {
    const { isLoading } = this.state;  
    const filteredApplications = this.filterApplications();
    const noMatchesFound = filteredApplications.length === 0;

    if (isLoading) {  
      return <div className="loader">Loading...</div>;
    }
    
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-header">User Dashboard</h1>

        <div className="filter-search-container">
          <div className="filter-container">
            <label htmlFor="filter">Filter Applications By:</label>
            <select id="filter bgblack" value={this.state.filterBy} onChange={this.handleFilterChange}>
              <option value="JobID">Job ID</option>
              <option value="first_name">First Name</option>
              <option value="last_name">Last Name</option>
              <option value="referrer">Referrer</option>
              <option value="job_type">Job Type</option>
            </select>
          </div>

          <Search onSearch={(query) => this.setState({ searchQuery: query })} />
        </div>

        {noMatchesFound && (
          <div className="no-match-found">
            No applications match your search
          </div>
        )}

        {!noMatchesFound && (
          <table className="applications-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Gender</th>
                <th>Date</th>
                <th>Referrer</th>
                <th>Job Type</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map((apply, index) => (
              <tr key={index}>
                <td>{apply.JobID}</td>
                <td>{apply.first_name}</td>
                <td>{apply.last_name}</td>
                <td>{apply.Email}</td>
                <td>{apply.Phone}</td>
                <td>{apply.Gender}</td>
                <td>{apply.Date}</td>
                <td>{apply.referrer}</td>
                <td>{apply.job_type}</td>
              </tr>))}
            </tbody>
          </table>
        )}
      </div>
    )
  }
}

export default Dashboard