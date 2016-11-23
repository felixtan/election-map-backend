import _ from 'lodash';
import cheerio from 'cheerio';
import fetch from 'node-fetch';
import Promise from 'bluebird';
import MongoClient from 'mongodb';
import dbconfig from '../config/mongo';
import searchAPIConfig from '../config/customSearch';
import statesLetterCodeToName from '../../app/fixtures/statesLetterCodeToName'
import { delay } from '../utils/helpers';

const elections = "elections"
const senators = "senators"
const levelOfGov = "country"
const branchOfGov = "legislativeUpper"

// RCP uses one letter in the tables where I'm getting the data
// In my app, I use three letters
const oneLetterToThreeLetterPartyCode = {
  "R": "REP",
  "D": "DEM",
  "G": "GRE",
  "L": "LIB",
  "I": "IND"
}

MongoClient.connect(dbconfig.uri, (err, db) => {
  if (err) throw err;
  console.log(`Connected to mongo database ${dbconfig.dbname}`);

  const electionsCollection = db.collection(elections)

  electionsCollection.findOne({ iso_a2: "US" }).then(doc => {
    const states = Object.keys(doc[levelOfGov][branchOfGov])

    _.each(doc[levelOfGov][branchOfGov], (body, stateCode) => {

      // filters out states without senate elections in 2016
      if (typeof body.candidates !== 'undefined' && stateCode === "NY") {

        // add slowness and unpredictbility to the scraper
        delay(randDelay(10000, 60000));

        // See Mongodb client api for updating arrays
        const pollsSourcesLoc = `${levelOfGov}.${branchOfGov}.${stateCode}.pollsSources.${body.pollsSources.length}`
        const mostRecentPollsLoc = `${levelOfGov}.${branchOfGov}.${stateCode}.mostRecentPolls.${body.mostRecentPolls.length}`

        // FOR RESETTING
        // const pollsSourcesLoc = `${levelOfGov}.${branchOfGov}.${stateCode}.pollsSources`
        // const mostRecentPollsLoc = `${levelOfGov}.${branchOfGov}.${stateCode}.mostRecentPolls`

        // Scrape google for rcp pages pertaining to state's senate election
        // senateRacePollsFinder(stateCode.toLowerCase(), 'us senate').then(link => {
          const link = "http://www.realclearpolitics.com/epolls/2016/senate/ny/new_york_senate_long_vs_schumer-5851.html"
          // visit the rcp page and scrape the latest rcp avg poll
          parsePollsInfo(link).then(info => {

            // if the poll is already in the elections object, then skip
            if (!_.includes(body.pollsSources, info.source) && !alreadyHasPoll(info.poll, body.mostRecentPolls)) {

              electionsCollection.update({ iso_a2: "US" }, { $set: {
                [pollsSourcesLoc]: info.source,
                [mostRecentPollsLoc]: info.poll
              }}, null, (err, result) => {
                if (err) console.error(err)

                if (result.result.ok === 1) {
                  console.log(`${states.indexOf(stateCode)+1}: done updating ${stateCode}`)
                } else {
                  console.log(`${states.indexOf(stateCode)+1}: error updating ${stateCode}`)
                }
              });
            }
          }).catch(err => {
            console.error(err);
          });
        // }).catch(err => {
        //   console.error(err);
        // });
      } else {
        console.log(`${states.indexOf(stateCode)+1}: skipped ${stateCode}`)
      }
    });
  }, err => {
    console.error(err);
  });
});


function alreadyHasPoll(newPoll, mostRecentPolls) {
  const p = _.find(mostRecentPolls, poll => {
    return (newPoll.date === poll.date && newPoll.source === poll.source)
  });
  return (typeof p !== 'undefined')
}

// link to RCP senate race polls
function parsePollsInfo(link) {
  return fetch(link).then(res => {
    return res.text();
  }).then(html => {
    const $ = cheerio.load(html);
    const headersRow = $('tr.header').toArray();   // find indices with candidate names

    // some states' polls table doesn't have an rcpAvg row
    // const rcpAvgRow = $('tr.rcpAvg').toArray();    // find poll nums based on indices
    const rcpAvgRow = $('tr').attr('data-id', '112852').toArray();

    return Promise.reduce(headersRow[0].children, (res, row, index) => {
      if (typeof res.source === 'undefined') res.source = link
      if (typeof res.poll === 'undefined') res.poll = { source: link }

      // date = th.date
      // cans = th.diag
      if (row.attribs.class === 'diag') {
        // console.log()
        const nameAndParty = row.children[0].children[0].children[0].data.replace(/([()])/g, '').split(' ')     // name and party for candidates

        /*
          California has a senate election system where 2 cans from the same party can face each other in
          the general.

          So now res.polls[party] is an array, others might be an object.
        */
        if (typeof res.poll[oneLetterToThreeLetterPartyCode[nameAndParty[1]]] === 'undefined') res.poll[oneLetterToThreeLetterPartyCode[nameAndParty[1]]] = []

        res.poll[oneLetterToThreeLetterPartyCode[nameAndParty[1]]].push({
          lastName: nameAndParty[0],
          num:  rcpAvgRow[0].children[index].children[0].data
        })
      }

      if (row.attribs.class === 'date') {
        console.log(rcpAvgRow[index].children[0].data)
        const d = new Date()
        const dateRange = rcpAvgRow[index].children[0].data
        console.log(dateRange)
        // const dateRange = rcpAvgRow[0].children[index].children[0].data
        const endDate = dateRange.replace(/-/g, '').split('  ')[1].split('/')   // has the form 10/30 - 11/2
        const mostRecent = (new Date(d.getFullYear(), endDate[0], endDate[1])).getTime()
        res.poll.date = mostRecent
      }
      // console.log(res)
      return res
    }, {});
    }).catch(function(err) {
      console.log(err);
    });
}

/*
  Query params
*/
// structure: <name> <state> <office> "election 2016"
// const query = "margaret hassan new hampshire senate election 2016"
// using siteSearch: www.realclearpolitics.com/epolls/2016/senate
function senateRacePollsFinder(stateCode, office) {
  const query = queryStringBuilder(stateCode, office)

  return fetch(query).then(res => {
    if (res.status == 200) {
      return res.text();
    } else {
      console.log(res.ok);
      console.log(res.status);
      console.log(res.statusText);
      console.log(res.headers.get('content-type'));
      return null;
    }
  }).then(doc => {
    if (doc === null) {
      return "Fetch error occurred."
    } else {
      const $ = cheerio.load(doc);
      const results = $('h3.r a').toArray();
      const topRes = results[0].attribs.href;

      // get the index in order to
      // remove /url?q= from the beginning
      const begin = topRes.indexOf('http://')

      // get the index in order to
      // remove everything after .html
      // 5 is the length of .html
      const end = topRes.indexOf('.html') + 5

      return topRes.substring(begin, end);
    }
  }).catch(function(err) {
      console.log(err);
  });
}

/*
  url: the api endpoint and nothing more
  query: search string like you would normally type into google
  key: api key
  params: object with key/value pairs for API options/params

  DEPRECATED: Google Custom Search API is no longer an option because they have a
  100 request/day limit

  PAID OPTIONS
    Google
      $5/1000 queries and up to 10K queries/day
    Bing
      5000 free queries/month
      $20/10000 transactions /month where a transaction is a single result returned from a query
*/
function _queryStringBuilder(url, query, params) {
  query = query.trim().replace(/ /g, '+')
  url += `?q=${query}`
  for (const key in params) {
    url += `&${key}=${params[key]}`
  }
  return url
}

function querifyString(s) {
  return s.trim().replace(/ /g, '+')
}

/*
  using siteSearch: www.realclearpolitics.com/epolls/2016/senate
*/
function queryStringBuilder(stateCode, office) {
  return `https://www.google.com/search?q=${querifyString(statesLetterCodeToName[stateCode.toUpperCase()])}+${querifyString(office)}+2016+site%3Awww.realclearpolitics.com%2Fepolls%2F2016%2Fsenate&oq=${querifyString(statesLetterCodeToName[stateCode.toUpperCase()])}+${querifyString(office)}+2016+site%3Awww.realclearpolitics.com%2Fepolls%2F2016%2Fsenate&aqs=chrome..69i57.991j0j9&sourceid=chrome&ie=UTF-8`
}

/*
  min and max milliseconds to wait before querying again
  ex. 10000 - 30000
*/
function randDelay(min, max) {
  return (parseInt(Math.random() * (max - min)) + 1)
}
