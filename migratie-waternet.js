const fs = require('fs')
const path = require('path')
const axios = require('axios')

const INPUT_FOLDER = 'input-migratie'

const messageRouteMap = {
  'ag assets': 'aga',
  'ag productiestaat': 'agp',
  'beoordeling ag assets': 'beoordelingaga',
  'beoordeling ag productiestaat': 'beoordelingagp',
  'beoordeling technisch gereed': 'beoordelingtg',
  'opdracht gereed': 'opdrachtgereed',
  opdracht: 'opdracht',
  planning: 'planning',
  'technisch gereed': 'tg',
  bijstelling: 'bijstelling',
  annulering: 'annulering',
  'annulering gereed': 'annuleringgereed',
}

async function main () {
  const files = fs.readdirSync('input-migratie')

  for (const file of files) {
    const [opdrachtId, messageType, datePlusHour, minutes, seconds, versie] = file.split('_')

    const [date, hour] = datePlusHour.split(' ')

    const datetime = `${date}T${hour}:${minutes}:${seconds}Z`

    console.log(datetime)
    const mappedMessageType = messageRouteMap[messageType.toLowerCase()]

    const data = fs.readFileSync(path.join(__dirname, `${INPUT_FOLDER}/${file}`))

    let input = sanitize(data)

    input = removeEmpty(input)

    /** @type {import('axios').AxiosRequestConfig} */
    const requestOptions = {
      data: input,
      url: `http://localhost:8080/rest/dsp/${mappedMessageType}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }

    try {
      console.log(`sending ${file}`)
      await axios.default(requestOptions)

      await new Promise((resolve) => setTimeout(resolve, 300))

      await fs.rename(
        path.join(__dirname, `output/${mappedMessageType}.xml`),
        path.join(__dirname, `output-migratie/${opdrachtId}__${mappedMessageType}__${datetime}__${versie}.xml`),
        (e) => { if (e) { return console.error } },
      )
    } catch (e) {
      const { data, ...rest } = requestOptions

      console.error({ ...rest, msg: e.emessage, filename: file })
    }
  }
}

main()

function sanitize (input) {
  const json = JSON.parse(input.toString())

  const arr = json.Leveradres?.AdresOrGPSLocatieOrBAGLocatie

  if (!arr?.at(0)) return input

  const { Adres, GPSLocatie, BAGLocatie, BGTLocatie } = arr.at(0)

  Adres.Gemeentecode = Adres.GemeenteCode
  delete Adres.GemeenteCode

  BGTLocatie['BGT-ID'] = BGTLocatie.BGTID
  delete BGTLocatie.BGTID

  json.Leveradres.AdresOrGPSLocatieOrBAGLocatie = [
    { Adres }, { GPSLocatie }, { BAGLocatie }, { BGTLocatie },
  ]

  return json
}

function removeEmpty (obj) {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) { value.forEach(removeEmpty) } else if (typeof value === 'object') {
      value = removeEmpty(value)
    }

    if (!value || value === '') {
      delete obj[key]
    }
  })

  return obj
}
