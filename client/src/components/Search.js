import React, { Component } from 'react'

class Search extends Component {
  state = {
    query: ''
  }

  handleChange = (event) => {
    this.setState({ query: event.target.value });
    this.props.onSearch(event.target.value);
  }

  render() {
    return (
      <input type="text" placeholder="Search" value={this.state.query} onChange={this.handleChange} />
    )
  }
}

export default Search;