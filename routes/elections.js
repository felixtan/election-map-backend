module.exports = (db) => {
  const router = require('express').Router()
  const ELECTIONS = 'elections'

  router.route('/:country')
    .get(getByCountry)

  function getByCountry(req, res, next) {
    const q = req.params;
    db.collection(ELECTIONS)
      .findOne({ iso_a2: q.country.toUpperCase() })
      .then(doc => {
        res.json(doc)
        // console.log(res._header)
        console.log(res._headers)
      })
  }

  return router
}
