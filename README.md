# Politics Map (Backend)

Backend for [politics-map](https://github.com/felixtan/politics-map-web-client) clients.

## Config
Make a `config` directory in the root and a `mongo.js` file inside of it. It should export a mongodb connection string for the database like this:
```javascript
{
  uri: "mongodb://<username>:<password>@<host>:<port>/<dbname>"
}
```

## Install
```javascript
npm install
```

## Running the development server
```javascript
npm run dev
```

## Data structure and Overview
The structure of the data is described below. There are three "levels" of representation displayed on the map. They correspond to the Executive or White House, the Senate, and the House of Representatives. Each level of representation corresponds to a politicogeographical level: the country, state, and sub-state levels, respectively. All representatives at each level are stored in a single document and are loaded at once.

### Representative
The structure of individual elected officials is based on the structure of representatives in [Google's Civic Info API](https://developers.google.com/civic-information/).
```javascript
{
	"name" : "Barack Obama",
	"address" : [
		{
			"line1" : "The White House",
			"line2" : "1600 pennsylvania avenue nw",
			"city" : "washington",
			"state" : "DC",
			"zip" : "20500"
		}
	],
	"party" : "Democratic Party",
	"phones" : [
		"(202) 456-1111"
	],
	"urls" : [
		"https://en.wikipedia.org/wiki/Barack_Obama",
		"http://www.whitehouse.gov/",
		"https://www.google.com/search?q=barack+obama"
	],
	"channels" : [
		"https://www.facebook.com/barackobama/",
		"https://twitter.com/BarackObama"
	],
	"office" : "President of the United States",
	"photo" : {
		"url" : "http://www.whitehouse.gov/sites/default/files/imagecache/admin_official_lowres/administration-official/ao_image/president_official_portrait_hires.jpg",
		"attrib" : null,
		"source" : null,
		"title" : null,
		"changes" : null
	}
}
```

### Executive
The representatives of the executive branch are stored in a document in the `countryExecutives` collection. This is unlike the structure for members of Congress below because my eventual goal is to represent other countries on the map. A country's document would be referred to via its [two-letter ISO code](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2).
```javascript
{
    "iso_a2": "US",
    "iso_a3": "USA",
    "name": {
        "official" : "United States of America",
		"informal" : "United States"
    },
    "representatives": {
        "headOfState": Representative,
        "deputyHeadOfState": Representative
    }
}
```

### Senate
The `senators` collection uses two-letter [FIPS state codes](https://en.wikipedia.org/wiki/Federal_Information_Processing_Standard_state_code) to represent the states. The values are two-element arrays storing the two senators of the state. US territories are included in the collection and have empty arrays because they do not have representation in the Senate.
```javascript
{
    "AL": [Representative, Representative],
    "AK": [Representative, Representative],
    "AS": [],
    ...
}
```

### House of Representatives
In the `houseReps` collection, states are represented as objects whose keys are the congressional districts in that state. The value of each congressional district is its sole representative.
```javascript
{
    "AL": {
        "1": Representative,
        "2": Representative,
        ...
        "7": Representative
    },
    "AK": {
        "1": Representative
    },
    "AS": {
        "1": Representative
    },
    ...
}
```

### Elections

Elections for an individual office are represented as such. The value of the `candidates` key is an array of objects with structure like that of elected officials (see **Representative** above) where the data for candidates is filled out.
```javascript
{
    candidates: [Representatives],
    winner: {
        "name": "",
        "party": ""
    }
}
```

Documents in the `elections` collection contain such **Election** objects for each office up for election in a given year. If a particular office is not up for election, then its value is `null`. Here the Senate is referred to as `legislativeUpper` and the House is referred to as `legislativeLower`. `country` refers to elections at the federal/national level of government.
```javascript
{
    iso_a2: 'US',
    iso_a3: 'USA',
    country: {
        executive: Election,
        legislativeUpper: {
            "AL": Election,
            "AK": Election,
            "AZ": Election,
            ...
        },
        legislativeLower: {
            "AK": {
                "1": Election,
                "2": Election,
                ...
                "7": Election
            },
            "AK": {
                "1": Election
            },
            ...
        }
}
```
