import axios from 'axios'

export const register = newUser => {
  return axios
    .post('users/register', {
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      email: newUser.email,
      password: newUser.password
    })
    .then(response => {
      console.log('Registered')
      return response.data;
    })
    .catch(err => {
      console.log(err)
      return { error: 'This email address is already in use.' }
    })
}

export const login = user => {
  return axios
    .post('users/login', {
      email: user.email,
      password: user.password
    })
    .then(response => {
      if(response.status !== 200) {
        return Promise.reject(response.data.error);
      }

      localStorage.setItem('usertoken', response.data);
      return response.data;
    })
    .catch(err => {
      console.log(err);
      return Promise.reject(err.response.data.error);
    })
}