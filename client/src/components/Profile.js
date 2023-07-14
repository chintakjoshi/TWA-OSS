import React, { Component } from 'react'
import jwt_decode from 'jwt-decode'

class Profile extends Component {
  constructor() {
    super()
    this.state = {
      first_name: '',
      last_name: '',
      email: '',
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
      email: decoded.email
    })

    fetch('/Users/apply')
    .then(res => res.json())
    .then(apply => this.setState({ apply }))
    .catch(error => console.error('Error:', error));

  }

  render() {
    return (
      <div className="container">
        <div className="jumbotron mt-5">
          <div className="col-sm-8 mx-auto">
            <h1 className="text-center">PROFILE</h1>
          </div>
          <table className="table col-md-6 mx-auto">
            <tbody>
              <tr>
                <td>Fist Name</td>
                <td>{this.state.first_name}</td>
              </tr>
              <tr>
                <td>Last Name</td>
                <td>{this.state.last_name}</td>
              </tr>
              <tr>
                <td>Email</td>
                <td>{this.state.email}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="container">
        <table className="table col-md-6 mx-auto">
        <tbody>
  {this.state.apply.map((apply, index) => (
    <tr key={index}>
      <tr><td>First Name</td><td>{apply.JobID}</td></tr>
      <td>{apply.first_name}</td>
      <td>{apply.last_name}</td>
      <td>{apply.Email}</td>
      <td>{apply.Phone}</td>
      <td>{apply.Gender}</td>
      <td>{apply.Date}</td>
      <td>{apply.referrer}</td>
      <td>{apply.job_type}</td>
      {/* Add more fields as necessary */}
    </tr>
  ))}
</tbody>
</table>

        </div>
      </div>
    )
  }
}

export default Profile