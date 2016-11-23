import express from 'express';

const router = express.Router();

/*
    general uris: /api/:country/:levelOfGov/:subDivision/:role/:id

      country: two-letter abbreviation of country (ex. US, UK, FR)
      levelOfGov: national, state, local
      subDivision: For levelOfGov=national, this is 0 or null. For country=US and levelOfGov=state, subDivision two-letter abbreviation of state (ex. NY, NJ)
      role: executive, legislatorUpperBody, legislatorLowerBody
      id: denotes seat of specific official (ex. congressional district)
        - caveat: if country=US, levelOfGov=national, role=executive and id=0, then return POTUS
                  if country=US, levelOfGov=national, role=executive and id=1, then return VP (although he's not an elected official)
*/

router.route('/:levelOfGov/:branchOfGov/:country/:subDivision/:role/:id')
  .get((req, res) => {
      console.log(req);
  });


export default router;
