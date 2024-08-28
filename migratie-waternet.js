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

    const actualVersie = `${versie.split('.').at(0)}${versie.split('.').at(1)}`

    const [date, hour] = datePlusHour.split(' ')

    const datetime = `${date}T${hour}:${minutes}:${seconds}Z`

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
        // path.join(__dirname, `output-migratie/${opdrachtId}__${mappedMessageType}__${actualVersie}.xml`),
        path.join(__dirname, `output-migratie/${opdrachtId}__${mappedMessageType}__${datetime.replaceAll(':', '.,')}__${actualVersie}.xml`),
        (e) => { if (e) { return console.error } },
      )
    } catch (e) {
      const { data, ...rest } = requestOptions

      console.error({ ...rest, msg: e.message, filename: file })
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

  const adressen = []

  if (Adres) adressen.push({ Adres })
  if (GPSLocatie) adressen.push({ GPSLocatie })
  if (BAGLocatie) adressen.push({ BAGLocatie })

  if (BGTLocatie) {
    BGTLocatie['BGT-ID'] = BGTLocatie.BGTID
    delete BGTLocatie.BGTID
    adressen.push({ BGTLocatie })
  }

  json.Leveradres.AdresOrGPSLocatieOrBAGLocatie = adressen

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
