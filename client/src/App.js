import React, { Component } from 'react'
import { BrowserRouter as Router, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import Landing from './components/Landing'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import Apply from './components/apply'
import MyProfile from './components/MyProfile'
import './App.css'

class App extends Component {
  render() {
    return (
      <Router>
        <div className="App">
          <Navbar />
          <Route exact path="/" component={Landing} />
          <div className="container">
            <Route exact path="/register" component={Register} />
            <Route exact path="/login" component={Login} />
            <Route exact path="/Dashboard" component={Dashboard} />
            <Route exact path="/apply" component={Apply} />
            <Route exact path="/MyProfile" component={MyProfile} />
          </div>
        </div>
      </Router>
    )
  }
}

export default App
