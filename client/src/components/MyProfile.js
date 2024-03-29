import React, { Component } from 'react'
import jwt_decode from 'jwt-decode'

class MyProfile extends Component {
  constructor() {
    super()
    this.state = {
      first_name: '',
      last_name: '',
      email: '',
      errors: {},
      apply: []
    }
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
    const token = localStorage.usertoken
    const decoded = jwt_decode(token)
    this.setState({
      first_name: decoded.first_name,
      last_name: decoded.last_name,
      email: decoded.email
    })

    fetch('/Users/apply')
      .then(res => res.json())
      .then(apply => {
        if (this._isMounted) {
          this.setState({ apply })
        }
      })
      .catch(error => console.error('Error:', error));

  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  render() {
    return (
      <div className="container">
        <div className="jumbotron mt-5">
          <div className="col-sm-8 mx-auto">
            <h1 className="text-center">My Profile</h1>
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
      </div>
    )
  }
}

export default MyProfile