const express = require('express')
const http = require('http')
const fs = require('fs')

const config = {
  logHeaders: false,
  logBody: false,
  port: 3020,
}
const xmlResponse = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bij1="http://dsplatform.nl/v136/participant/Bijstelling">
  <soapenv:Body>
    <ns6:MT_CommonResponse xmlns:xs='http://www.w3.org/2001/XMLSchema' xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xmlns:ns2='http://dsplatform.nl/v136/participant/Planning' xmlns:ns6='http://dsplatform.nl/dsp/Common' xmlns:ns4='http://dsplatform.nl/v136/dsp/Planning' xmlns:ns3='http://dsplatform.nl/dsp/Header' xmlns:ns5='http://dsplatform.nl/v136/dsp/Algemeen'>
    <OpdrachtID>ENX-S-4715627</OpdrachtID>
    <ResponseCode>OK</ResponseCode>
    <MessageID>43eef9295ba111efc28f0000007baf16</MessageID>
    </ns6:MT_CommonResponse>
  </soapenv:Body>
</soapenv:Envelope>
`

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

app.set('port', config.port)
app.use(rawBody)
app.use(logger)

app.post('*', (req, res) => {
  let extension, response
  const { filename, status } = req.query

  try {
    JSON.parse(req.rawBody)

    extension = 'json'
    response = { OpdrachtID: '123' }
  } catch (e) {
    extension = 'xml'
    response = xmlResponse
  }

  const fileLocation = `output/${filename || 'result'}.${extension}`

  fs.writeFileSync(fileLocation, req.rawBody, err => {
    if (err) {
      console.error(err)
      throw err
    }
  })

  console.log(`saved to ${fileLocation}`)
  res
    .status(+status || 200)
    .setHeader('Content-Type', extension === 'json' ? 'application/json' : 'application/xml')
    .send(response)
})

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'))
})
