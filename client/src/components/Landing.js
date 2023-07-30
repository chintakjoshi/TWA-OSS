import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Link } from 'react-router-dom';

class Landing extends Component {
  render() {
    return (
      <div className="container">
        <style>
          {`
            body {
              background-color: darkblue;
            }
          `}
        </style>
        <div className="jumbotron mt-5 bg-blue text-black">
          <h1 className="display-4">Welcome to SLU-Transformative Workforce Academy</h1>
          <p className="lead">Connecting Justice-Involved Jobseekers and Second Chance Employers.</p>
          <hr className="my-4" />
          <p>In turbulent economic times, companies need a workforce that is loyal, hardworking, and increases their bottom line. With the potential to save companies $3,146 per employee, hiring justice-involved talent promotes self-sufficiency for individuals, success for companies, growth for our economy, and public safety for our region.</p>
          <p className="lead">
            <a className="btn btn-primary btn-lg" href="https://second-chance-slu.web.app/" target="_blank" rel="noopener noreferrer" role="button">Learn more</a>
          </p>
        </div>
        <div className="jumbotron mt-5 bg-blue text-black">
          <h2 className="display-5"> Are you Justice-involved and Looking for a job?</h2>
          <hr className="my-4" />
          <p className="lead">
          <Link className="btn btn-primary btn-lg" to="/apply" role="button">Apply here</Link>
          </p>
        </div>
      </div>
    );
  }
}

export default Landing;