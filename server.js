var express = require('express')
var cors = require('cors')
var bodyParser = require('body-parser')
var app = express()
var port = process.env.PORT || 5000

app.use(bodyParser.json())
app.use(cors())
app.use(
  bodyParser.urlencoded({
    extended: false
  })
)

var Users = require('./routes/Users')

app.use('/users', Users)


//when using localhost uncomment this
// app.listen(port, function() {
//   console.log('Server is running on port: ' + port)
// })

// when configuring docker uncomment this
app.listen(port, '0.0.0.0', function() {
  console.log('Server is running on port: ' + port)
})