import React, { Component } from 'react';
import { register } from './UserFunctions';

class Register extends Component {
  constructor() {
    super();
    this.state = {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      errors: {}
    };

    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  onChange(e) {
    this.setState({ [e.target.name]: e.target.value });
  }

  onSubmit(e) {
    e.preventDefault();

    if (!this.state.first_name || !this.state.last_name || !this.state.email || !this.state.password) {
      alert('All fields are mandatory');
      return;
    }

    const newUser = {
      first_name: this.state.first_name,
      last_name: this.state.last_name,
      email: this.state.email,
      password: this.state.password
    };

    register(newUser).then(res => {
      if (res.error) {
        alert(res.error);
      } else {
        this.props.history.push(`/login`);
        alert('Registered successfully');
      }
    });
  }

  render() {
    return (
      <div className="container" style={{ height: '100vh' }}>
        <div className="row align-items-center justify-content-center h-100">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <form noValidate onSubmit={this.onSubmit}>
                  <h1 className="h3 mb-3 font-weight-normal">Register</h1>
                  {this.state.responseMessage && (<p className="text-danger">{this.state.responseMessage}</p>)}
                  <div className="form-group">
                    <label htmlFor="first_name">First name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="first_name"
                      placeholder="Enter your first name"
                      value={this.state.first_name}
                      onChange={this.onChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="last_name">Last name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="last_name"
                      placeholder="Enter your last name"
                      value={this.state.last_name}
                      onChange={this.onChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email address</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      placeholder="Enter email"
                      value={this.state.email}
                      onChange={this.onChange}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      placeholder="Password"
                      value={this.state.password}
                      onChange={this.onChange}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary btn-block"
                  >
                    Register
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Register;