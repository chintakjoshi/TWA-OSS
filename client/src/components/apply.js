import React, { Component } from 'react';
import axios from 'axios';

class Apply extends Component {
  state = {
    firstName: '',
    lastName: '',
    jobType: '',
    message: '',
    color: 'black',
    // additional state fields for your form
  };

  handleChange = (e) => {
    this.setState({
      [e.target.id]: e.target.value
    });
  }

  handleSubmit = (e) => {
    e.preventDefault();

    const { firstName, lastName, jobType } = this.state;

    if (firstName === '' || lastName === '' || jobType === '') {
      this.setState({
        message: 'All fields are required.',
        color: 'red'
      });
      return;
    }

    axios.post('/users/apply', this.state)
      .then(response => {
        if (response.data.status === 'Application submitted!') {
          this.setState({
            message: 'Thank you for filling the form, We will get back to you shortly!!!',
            color: 'green'
          });
        } else {
          this.setState({
            message: 'You have already applied, Thank you!!!',
            color: 'red'
          });
        }
      })
      .catch(error => {
        console.log(error);
        this.setState({
          message: 'An error occurred.',
          color: 'red'
        });
      });
  }

  render() {
    return (
      <div className="container">
        <style>{`
          body { background-color: darkblue; }
          .card { max-width: 600px; margin: 0 auto; }
          .card-title { color: black; }
          .form-group { margin-bottom: 1.5rem; }
          .form-label { color: black; }
          .form-input { width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #ccc; }
          .form-select { width: 100%; padding: 0.5rem; border-radius: 4px; border: 1px solid #ccc; }
          .submit-btn { background-color: #4CAF50; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
          .message { color: ${this.state.color}; font-weight: bold; }
        `}</style>
        <div className="card mt-5">
          <div className="card-body bg-blue text-white">
            <h1 className="card-title text-center">Enter the Details</h1>
            <form onSubmit={this.handleSubmit}>
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">Enter your First Name:</label>
                <input type="text" id="firstName" className="form-input" onChange={this.handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="lastName" className="form-label">Enter your Last Name:</label>
                <input type="text" id="lastName" className="form-input" onChange={this.handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="jobType" className="form-label">Job Type:</label>
                <select id="jobType" className="form-select" onChange={this.handleChange}>
                  <option value="">--Please choose an option--</option>
                  <option value="fullTime">Full-Time</option>
                  <option value="partTime">Part-Time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              {/* Additional fields for your form */}
              <button type="submit" className="submit-btn">Submit</button>
            </form>
            <p className="message">{this.state.message}</p>
          </div>
        </div>
      </div>
    );
  }
}

export default Apply;
