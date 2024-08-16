const express = require('express')
const http = require('http')
const fs = require('fs')

const config = {
  logHeaders: false,
  logBody: false,
}

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

/**
 *
 * @param {import('express').Request} req
 * @param {*} res
 * @param {*} next
 */
function logger (req, res, next) {
  console.log(`[${new Date().toISOString()}] - ${req.method} at url ${req.url}`)
  if (config.logHeaders) console.log(req.headers)
  if (config.logBody) console.log(req.body)
  next()
}

app.set('port', process.env.PORT || 1337)
app.use(rawBody)
app.use(logger)

app.post('*', (req, res) => {
  let extension
  const { filename, status } = req.query

  try {
    JSON.parse(req.rawBody)

    extension = 'json'
  } catch (e) {
    extension = 'xml'
  }

  const fileLocation = `output/${filename || 'result'}.${extension}`

  fs.writeFileSync(fileLocation, req.rawBody, err => {
    if (err) {
      console.error(err)
      throw err
    }
  })

  console.log(`saved to ${fileLocation}`)
  res.status(status || 200).send({ OpdrachtID: '123' })
})

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'))
})
