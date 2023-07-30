import React, { Component } from 'react';
import { login } from './UserFunctions';
import slulogo from '../componentstyles/slu.png';

class Login extends Component {
  constructor() {
    super();
    this.state = {
      email: '',
      password: '',
      errors: {},
    };

    this.onChange = this.onChange.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
  }

  onChange(e) {
    this.setState({ [e.target.name]: e.target.value });
  }

  onSubmit(e) {
    e.preventDefault();
  
    if (!this.state.email || !this.state.password) {
      alert('All fields are mandatory');
      return;
    }
  
    const user = {
      email: this.state.email,
      password: this.state.password,
    };
  
    login(user)
      .then((res) => {
        this.props.history.push(`/Dashboard`);
      })
      .catch(err => {
        alert(err);
      });
  }  

  render() {
    return (
      <div className="container" style={{height: '100vh'}}>
        <div className="row align-items-center justify-content-center h-100">
          <div className="col-md-6">
            <div className="card">
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '150px', // Adjust based on your image's aspect ratio
            }}>
              <img src={slulogo} alt="slu"/>
            </div>
              <div className="card-body">
                <form noValidate onSubmit={this.onSubmit}>
                  <h1 className="h3 mb-3 font-weight-normal text-center">Sign in here</h1>
                  {this.state.responseMessage && (<p className="text-danger">{this.state.responseMessage}</p>)}
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
                    Sign in
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

export default Login;