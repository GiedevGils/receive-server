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
    const [opdrachtId, messageType, versie, dateTime] = file.split('_')

    const [date, time] = dateTime.split('.').at(0).split(' ')

    const [l1, l2, l3, l4, l5, l6] = time
    const datetime = `${date}T${l1}${l2}:${l3}${l4}:${l5}${l6}Z`
    const mappedMessageType = messageRouteMap[messageType.toLowerCase()]

    const data = fs.readFileSync(path.join(__dirname, `${INPUT_FOLDER}/${file}`))

    /** @type {import('axios').AxiosRequestConfig} */
    const requestOptions = {
      data,
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
