const express = require('express')
const http = require('http')
const fs = require('fs')

const app = express()

function rawBody (req, res, next) {
  req.setEncoding('utf8')
  req.rawBody = ''
  req.on('data', function (chunk) {
    req.rawBody += chunk
  })
  req.on('end', function () {
    next()
  })
}

app.set('port', process.env.PORT || 1337)
app.use(rawBody)

app.post('/', function (req, res) {
  let extension

  try {
    JSON.parse(req.rawBody)

    extension = 'json'
  } catch (e) {
    extension = 'xml'
  }

  fs.writeFileSync(`output/result.${extension}`, req.rawBody, err => {
    if (err) {
      console.error(err)
      throw err
    }
  })
  res.status(200).send({
    OpdrachtID: JSON.parse(req.rawBody).OpdrachtID,
    ResponseCode: 'OK',
    MessageID: Date.now(),
  })
})

app.get('/', function (req, res) {
  console.log('get request')
  res.status(200).json({ message: 'request received' })
})

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'))
})
