import React, { Component } from 'react'
import jwt_decode from 'jwt-decode'

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
      apply: []
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

    fetch('/Users/apply')
    .then(res => res.json())
    .then(apply => this.setState({ apply }))
    .catch(error => console.error('Error:', error));

  }

  render() {
    return (
     <div className="container">
        <table className="table col-md-6 mx-auto">
          <tbody>
            {this.state.apply.map((apply, index) => (
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
              {/* Add more fields as necessary */}
            </tr>))}
          </tbody>
        </table>
      </div>
    )
  }
}

export default Dashboard