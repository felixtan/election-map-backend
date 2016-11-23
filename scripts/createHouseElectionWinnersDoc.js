/*
  Correctness of the created doc depends on
    districtsPerState
      census data and drawing of congressional districts
    winners of the 2016 house elections
*/

import fs from 'fs'
import _ from 'lodash'
import beautify from 'js-beautify'
import districtsPerState from '../data/congressionalDistrictsPerState'

const file = process.cwd() + '/server/data/2016HouseElectionWinners.js'
// console.log(file)

let content = "export default {"

_.each(districtsPerState, (n, stateCode) => {
  content += `${stateCode}: {`
  _.each(_.range(n), i => {
    content += `${i+1}: "",`
  })
  content += `},`
})
content += "}"

// console.log(beautify(content))

fs.writeFile(file, beautify(content), err => {
  if (err) throw err

  fs.readFile(file, 'utf-8', (err, data) => {
    if (err) throw err
    console.log(data)
  })
})
