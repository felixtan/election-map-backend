module.exports = (db) => {
  const router = require('express').Router()
  const SENATORS = 'senators'
  const HOUSEREPS = 'houseReps'
  const EXECUTIVE = 'countryExecutives'

  // GET all us senators or house reps or country level execs
  router.route('/:levelOfGov/:branchOfGov/:role/:country')
    .get(getAllFn)

  function getAllFn(req, res, next) {
    const q = req.params;

    // TODO: Tidy up this if-else chaining
    // TODO: Make a representatives collection and place senators, houseReps inside
    // Role is not used when branchOfGov=executive
    if (q.levelOfGov === 'country' && q.country.toLowerCase() === 'us') {
      if (q.branchOfGov === 'legislative') {
        if (q.role === 'upper') {
          db.collection(SENATORS)
            .findOne()
            .then(data => res.json(data))
        } else if (q.role === 'lower') {
          db.collection(HOUSEREPS)
            .findOne()
            .then(data => res.json(data))
        } else {
          const msg = `Invalid role in request url: ${q.role}`
          res.status(400).json({ msg: msg })
          next(new Error(msg))
        }
      } else if (q.branchOfGov === 'executive') {
        db.collection(EXECUTIVE)
          .findOne({ iso_a2: q.country.toUpperCase() })
          .then(data => res.json(data))
      } else {
        const msg = `Invalid branch of gov in request url: ${q.branchOfGov}`
        res.status(400).json({ msg: msg })
        next(new Error(msg))
      }
    } else if (q.levelOfGov === 'state' && q.country.toLowerCase() === 'us') {
      if (q.branchOfGov === 'legislative') {
        if (q.role === 'upper') {
          db.collection('stateSenators')
            .findOne()
            .then(data => { res.json(data); });
        } else if (q.role === 'lower') {
          db.collection('stateAssemblyMembers')
            .findOne()
            .then(data => { res.json(data); });
        } else {
          res.status(400).json({ msg: 'Invalid role in request url' });
        }
      } else {
        res.status(400).json({ msg: 'Invalid request url' });
      }
    } else {
      res.status(400).json({ msg: 'Invalid request url' });
      next(new Error(`Invalid request url`))
    }
  }

  return router
}
