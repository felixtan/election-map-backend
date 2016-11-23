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
    // console.log(q);

    // TODO: Use query params in db query, not if statement
    // Role is not used when branchOfGov=executive
    if (q.levelOfGov === 'country' && q.country.toLowerCase() === 'us') {
      if (q.branchOfGov === 'legislative') {
        if (q.role === 'upper') {
          db.collection(SENATORS)
            .findOne()
            .then(data => { res.json(data); });
        } else if (q.role === 'lower') {
          db.collection(HOUSEREPS)
            .findOne()
            .then(data => { res.json(data); });
        } else {
          res.status(400).json({ msg: 'Invalid role in request url' });
        }
      } else if (q.branchOfGov === 'executive') {
        db.collection(EXECUTIVE)
          .findOne({ iso_a2: q.country.toUpperCase() })
          .then(data => { res.json(data); });
      } else {
        res.status(400).json({ msg: 'Invalid branchOfGov in request url' });
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
    }
  }

  return router
}
