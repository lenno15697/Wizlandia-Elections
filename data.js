/* Model constants exported from python/wizlandia_election_simulator.py. */
(function(root){
const data = {
  "parties": [
    {
      "code": "LDP",
      "name": "Liberal Democratic Party",
      "color": "#000080",
      "x": 4.0,
      "y": -0.5,
      "description": "Market liberal; classical liberal and national liberal factions. Strong defence and national sovereignty."
    },
    {
      "code": "CA",
      "name": "Civic Alliance",
      "color": "#FF9000",
      "x": 0.0,
      "y": -0.5,
      "description": "Centrist and moderately pro-market. Families, public services, social cohesion and work-linked welfare."
    },
    {
      "code": "SDP",
      "name": "Social Democratic Party",
      "color": "#C00040",
      "x": -3.5,
      "y": -1.5,
      "description": "Social democracy, stronger labour institutions, redistribution and expanded public services."
    },
    {
      "code": "CON",
      "name": "Conservative Party",
      "color": "#60C0FF",
      "x": 2.0,
      "y": 4.5,
      "description": "Social conservatism, religious school choice, rural communities, farmers and fishermen."
    },
    {
      "code": "GRN",
      "name": "Green Party",
      "color": "#20A020",
      "x": 0.0,
      "y": -5.0,
      "description": "Cosmopolitan green liberalism, low-carbon energy, civil liberties and international cooperation."
    },
    {
      "code": "NF",
      "name": "National Front",
      "color": "#404040",
      "x": 0.0,
      "y": 8.0,
      "description": "National conservatism, immigration restriction, protectionism and fewer overseas commitments."
    },
    {
      "code": "LIB",
      "name": "Libertarian Party",
      "color": "#F0C000",
      "x": 8.0,
      "y": -3.0,
      "description": "Private property, personal freedom, fiscal restraint and a substantially smaller state."
    },
    {
      "code": "UPL",
      "name": "United Progressive Left",
      "color": "#E030C0",
      "x": -7.5,
      "y": -8.0,
      "description": "Democratic socialism, redistribution, social liberalism and Violetist minority interests."
    },
    {
      "code": "SWP",
      "name": "Socialist Workers Party",
      "color": "#700000",
      "x": -9.5,
      "y": -8.0,
      "description": "Communism and a fundamental transformation of economic ownership and political institutions."
    }
  ],
  "types": [
    {
      "id": 1,
      "name": "Financial and corporate centres",
      "count": 8,
      "x": 4.063888888888888,
      "y": -1.7368101230469748
    },
    {
      "id": 2,
      "name": "Affluent inner-city professional districts",
      "count": 8,
      "x": 3.2333333333333334,
      "y": -2.4368101230469748
    },
    {
      "id": 3,
      "name": "Technology and startup districts",
      "count": 6,
      "x": 4.208333333333334,
      "y": -2.576810123046975
    },
    {
      "id": 4,
      "name": "Creative and gentrifying inner districts",
      "count": 10,
      "x": 0.51,
      "y": -2.6468101230469747
    },
    {
      "id": 5,
      "name": "Established working-class urban districts",
      "count": 12,
      "x": -2.17,
      "y": -1.0368101230469748
    },
    {
      "id": 6,
      "name": "Mixed urban service-worker districts",
      "count": 10,
      "x": -0.19,
      "y": -0.756810123046975
    },
    {
      "id": 7,
      "name": "Capital-city public-employment districts",
      "count": 8,
      "x": 2.099171303650768,
      "y": -1.7368101230469748
    },
    {
      "id": 8,
      "name": "Major university and student districts",
      "count": 6,
      "x": -0.05,
      "y": -3.976810123046975
    },
    {
      "id": 9,
      "name": "Cosmopolitan merchant and migrant districts",
      "count": 8,
      "x": 2.511111111111111,
      "y": -1.876810123046975
    },
    {
      "id": 10,
      "name": "Social-housing and old industrial cores",
      "count": 4,
      "x": -2.29,
      "y": -0.05681012304697498
    },
    {
      "id": 11,
      "name": "Affluent managerial suburbs",
      "count": 16,
      "x": 3.6305555555555555,
      "y": -1.0368101230469748
    },
    {
      "id": 12,
      "name": "Business-owner and entrepreneurial suburbs",
      "count": 12,
      "x": 4.136111111111111,
      "y": -0.19681012304697498
    },
    {
      "id": 13,
      "name": "Educated professional family suburbs",
      "count": 14,
      "x": 2.980555555555555,
      "y": -1.3168101230469749
    },
    {
      "id": 14,
      "name": "Established middle-income homeowner suburbs",
      "count": 16,
      "x": 2.4388888888888887,
      "y": -0.19681012304697498
    },
    {
      "id": 15,
      "name": "Mixed-income commuter suburbs",
      "count": 16,
      "x": 0.86,
      "y": -0.40681012304697495
    },
    {
      "id": 16,
      "name": "Skilled-trade and contractor suburbs",
      "count": 12,
      "x": 1.98,
      "y": 0.643189876953025
    },
    {
      "id": 17,
      "name": "Rapid-growth outer suburbs",
      "count": 12,
      "x": 2.6555555555555554,
      "y": 0.433189876953025
    },
    {
      "id": 18,
      "name": "Diverse first-home buyer suburbs",
      "count": 8,
      "x": 1.96,
      "y": -0.896810123046975
    },
    {
      "id": 19,
      "name": "Environmentally minded garden suburbs",
      "count": 8,
      "x": 1.07,
      "y": -2.6468101230469747
    },
    {
      "id": 20,
      "name": "Older, settled middle-class suburbs",
      "count": 6,
      "x": 1.35,
      "y": 0.923189876953025
    },
    {
      "id": 21,
      "name": "Wealthy estate and executive exurbs",
      "count": 4,
      "x": 4.208333333333334,
      "y": 1.2731898769530252
    },
    {
      "id": 22,
      "name": "Construction-led family exurbs",
      "count": 4,
      "x": 2.9444444444444446,
      "y": 1.063189876953025
    },
    {
      "id": 23,
      "name": "Diversified regional-city centres",
      "count": 16,
      "x": 0.93,
      "y": -0.616810123046975
    },
    {
      "id": 24,
      "name": "Regional retail and commercial hubs",
      "count": 12,
      "x": 2.3305555555555553,
      "y": 0.08318987695302502
    },
    {
      "id": 25,
      "name": "Advanced-manufacturing cities",
      "count": 10,
      "x": 1.35,
      "y": -0.19681012304697498
    },
    {
      "id": 26,
      "name": "Manufacturing towns",
      "count": 10,
      "x": -0.75,
      "y": -0.05681012304697498
    },
    {
      "id": 27,
      "name": "Logistics and warehousing towns",
      "count": 10,
      "x": 0.58,
      "y": 0.36318987695302507
    },
    {
      "id": 28,
      "name": "Regional university and college towns",
      "count": 8,
      "x": -0.05,
      "y": -2.4368101230469748
    },
    {
      "id": 29,
      "name": "Healthcare and administrative centres",
      "count": 8,
      "x": 0.16,
      "y": -0.896810123046975
    },
    {
      "id": 30,
      "name": "Prosperous independent-business towns",
      "count": 8,
      "x": 3.125,
      "y": 0.923189876953025
    },
    {
      "id": 31,
      "name": "Declining former industrial towns",
      "count": 8,
      "x": -1.45,
      "y": 1.343189876953025
    },
    {
      "id": 32,
      "name": "Rail-connected commuter towns",
      "count": 6,
      "x": 0.37,
      "y": -1.176810123046975
    },
    {
      "id": 33,
      "name": "Productive commercial farming districts",
      "count": 12,
      "x": 3.3055555555555554,
      "y": 1.4831898769530252
    },
    {
      "id": 34,
      "name": "Mixed farming and rural-service districts",
      "count": 8,
      "x": 2.763888888888889,
      "y": 1.353189876953025
    },
    {
      "id": 35,
      "name": "Export wine, orchard and specialty-crop districts",
      "count": 8,
      "x": 3.486111111111111,
      "y": 0.203189876953025
    },
    {
      "id": 36,
      "name": "Traditional dairy and livestock districts",
      "count": 8,
      "x": 1.23,
      "y": 2.473189876953025
    },
    {
      "id": 37,
      "name": "Declining smallholder farming districts",
      "count": 8,
      "x": -0.19,
      "y": 2.183189876953025
    },
    {
      "id": 38,
      "name": "Forestry and timber communities",
      "count": 6,
      "x": 0.3,
      "y": 1.623189876953025
    },
    {
      "id": 39,
      "name": "Remote mining and extractive districts",
      "count": 6,
      "x": 0.37,
      "y": 2.673189876953025
    },
    {
      "id": 40,
      "name": "Scenic countryside and amenity-migration districts",
      "count": 6,
      "x": 0.93,
      "y": -2.226810123046975
    },
    {
      "id": 41,
      "name": "Rural commuter belts",
      "count": 6,
      "x": 2.475,
      "y": 1.133189876953025
    },
    {
      "id": 42,
      "name": "Strongly religious agricultural districts",
      "count": 4,
      "x": 1.23,
      "y": 3.023189876953025
    },
    {
      "id": 43,
      "name": "Naval dockyard and shipbuilding districts",
      "count": 4,
      "x": 2.908333333333333,
      "y": 1.55
    },
    {
      "id": 44,
      "name": "Officer-family and defence-contractor districts",
      "count": 4,
      "x": 3.558333333333333,
      "y": 1.623189876953025
    },
    {
      "id": 45,
      "name": "Port trading and import-export districts",
      "count": 4,
      "x": 1.9,
      "y": 0.08318987695302502
    },
    {
      "id": 46,
      "name": "Resort-business and tourism-owner districts",
      "count": 4,
      "x": 3.341666666666667,
      "y": -1.456810123046975
    },
    {
      "id": 47,
      "name": "Seasonal-worker and hospitality districts",
      "count": 2,
      "x": -1.92,
      "y": -1.876810123046975
    },
    {
      "id": 48,
      "name": "Wealthy retirement enclaves",
      "count": 2,
      "x": 3.4138888888888888,
      "y": 1.903189876953025
    },
    {
      "id": 49,
      "name": "Remote island and fishing communities",
      "count": 2,
      "x": 0.52,
      "y": 2.463189876953025
    },
    {
      "id": 50,
      "name": "Upscale waterfront and marina districts",
      "count": 2,
      "x": 4.497222222222222,
      "y": -2.016810123046975
    }
  ],
  "sourceTypes": [
    {
      "id": 1,
      "name": "Financial and corporate centres",
      "count": 8,
      "x": 4.8,
      "y": -1.7368101230469748
    },
    {
      "id": 2,
      "name": "Affluent inner-city professional districts",
      "count": 8,
      "x": 3.65,
      "y": -2.4368101230469748
    },
    {
      "id": 3,
      "name": "Technology and startup districts",
      "count": 6,
      "x": 5,
      "y": -2.576810123046975
    },
    {
      "id": 4,
      "name": "Creative and gentrifying inner districts",
      "count": 10,
      "x": 0.51,
      "y": -2.6468101230469747
    },
    {
      "id": 5,
      "name": "Established working-class urban districts",
      "count": 12,
      "x": -2.17,
      "y": -1.0368101230469748
    },
    {
      "id": 6,
      "name": "Mixed urban service-worker districts",
      "count": 10,
      "x": -0.19,
      "y": -0.756810123046975
    },
    {
      "id": 7,
      "name": "Capital-city public-employment districts",
      "count": 8,
      "x": 2.1,
      "y": -1.7368101230469748
    },
    {
      "id": 8,
      "name": "Major university and student districts",
      "count": 6,
      "x": -0.05,
      "y": -3.976810123046975
    },
    {
      "id": 9,
      "name": "Cosmopolitan merchant and migrant districts",
      "count": 8,
      "x": 2.65,
      "y": -1.876810123046975
    },
    {
      "id": 10,
      "name": "Social-housing and old industrial cores",
      "count": 4,
      "x": -2.29,
      "y": -0.05681012304697498
    },
    {
      "id": 11,
      "name": "Affluent managerial suburbs",
      "count": 16,
      "x": 4.2,
      "y": -1.0368101230469748
    },
    {
      "id": 12,
      "name": "Business-owner and entrepreneurial suburbs",
      "count": 12,
      "x": 4.9,
      "y": -0.19681012304697498
    },
    {
      "id": 13,
      "name": "Educated professional family suburbs",
      "count": 14,
      "x": 3.3,
      "y": -1.3168101230469749
    },
    {
      "id": 14,
      "name": "Established middle-income homeowner suburbs",
      "count": 16,
      "x": 2.55,
      "y": -0.19681012304697498
    },
    {
      "id": 15,
      "name": "Mixed-income commuter suburbs",
      "count": 16,
      "x": 0.86,
      "y": -0.40681012304697495
    },
    {
      "id": 16,
      "name": "Skilled-trade and contractor suburbs",
      "count": 12,
      "x": 1.98,
      "y": 0.643189876953025
    },
    {
      "id": 17,
      "name": "Rapid-growth outer suburbs",
      "count": 12,
      "x": 2.85,
      "y": 0.433189876953025
    },
    {
      "id": 18,
      "name": "Diverse first-home buyer suburbs",
      "count": 8,
      "x": 1.96,
      "y": -0.896810123046975
    },
    {
      "id": 19,
      "name": "Environmentally minded garden suburbs",
      "count": 8,
      "x": 1.07,
      "y": -2.6468101230469747
    },
    {
      "id": 20,
      "name": "Older, settled middle-class suburbs",
      "count": 6,
      "x": 1.35,
      "y": 0.923189876953025
    },
    {
      "id": 21,
      "name": "Wealthy estate and executive exurbs",
      "count": 4,
      "x": 5,
      "y": 1.2731898769530252
    },
    {
      "id": 22,
      "name": "Construction-led family exurbs",
      "count": 4,
      "x": 3.25,
      "y": 1.063189876953025
    },
    {
      "id": 23,
      "name": "Diversified regional-city centres",
      "count": 16,
      "x": 0.93,
      "y": -0.616810123046975
    },
    {
      "id": 24,
      "name": "Regional retail and commercial hubs",
      "count": 12,
      "x": 2.4,
      "y": 0.08318987695302502
    },
    {
      "id": 25,
      "name": "Advanced-manufacturing cities",
      "count": 10,
      "x": 1.35,
      "y": -0.19681012304697498
    },
    {
      "id": 26,
      "name": "Manufacturing towns",
      "count": 10,
      "x": -0.75,
      "y": -0.05681012304697498
    },
    {
      "id": 27,
      "name": "Logistics and warehousing towns",
      "count": 10,
      "x": 0.58,
      "y": 0.36318987695302507
    },
    {
      "id": 28,
      "name": "Regional university and college towns",
      "count": 8,
      "x": -0.05,
      "y": -2.4368101230469748
    },
    {
      "id": 29,
      "name": "Healthcare and administrative centres",
      "count": 8,
      "x": 0.16,
      "y": -0.896810123046975
    },
    {
      "id": 30,
      "name": "Prosperous independent-business towns",
      "count": 8,
      "x": 3.5,
      "y": 0.923189876953025
    },
    {
      "id": 31,
      "name": "Declining former industrial towns",
      "count": 8,
      "x": -1.45,
      "y": 1.343189876953025
    },
    {
      "id": 32,
      "name": "Rail-connected commuter towns",
      "count": 6,
      "x": 0.37,
      "y": -1.176810123046975
    },
    {
      "id": 33,
      "name": "Productive commercial farming districts",
      "count": 12,
      "x": 3.75,
      "y": 1.4831898769530252
    },
    {
      "id": 34,
      "name": "Mixed farming and rural-service districts",
      "count": 8,
      "x": 3,
      "y": 1.353189876953025
    },
    {
      "id": 35,
      "name": "Export wine, orchard and specialty-crop districts",
      "count": 8,
      "x": 4,
      "y": 0.203189876953025
    },
    {
      "id": 36,
      "name": "Traditional dairy and livestock districts",
      "count": 8,
      "x": 1.23,
      "y": 2.473189876953025
    },
    {
      "id": 37,
      "name": "Declining smallholder farming districts",
      "count": 8,
      "x": -0.19,
      "y": 2.183189876953025
    },
    {
      "id": 38,
      "name": "Forestry and timber communities",
      "count": 6,
      "x": 0.3,
      "y": 1.623189876953025
    },
    {
      "id": 39,
      "name": "Remote mining and extractive districts",
      "count": 6,
      "x": 0.37,
      "y": 2.673189876953025
    },
    {
      "id": 40,
      "name": "Scenic countryside and amenity-migration districts",
      "count": 6,
      "x": 0.93,
      "y": -2.226810123046975
    },
    {
      "id": 41,
      "name": "Rural commuter belts",
      "count": 6,
      "x": 2.6,
      "y": 1.133189876953025
    },
    {
      "id": 42,
      "name": "Strongly religious agricultural districts",
      "count": 4,
      "x": 1.23,
      "y": 3.023189876953025
    },
    {
      "id": 43,
      "name": "Naval dockyard and shipbuilding districts",
      "count": 4,
      "x": 3.2,
      "y": 1.55
    },
    {
      "id": 44,
      "name": "Officer-family and defence-contractor districts",
      "count": 4,
      "x": 4.1,
      "y": 1.623189876953025
    },
    {
      "id": 45,
      "name": "Port trading and import-export districts",
      "count": 4,
      "x": 1.9,
      "y": 0.08318987695302502
    },
    {
      "id": 46,
      "name": "Resort-business and tourism-owner districts",
      "count": 4,
      "x": 3.8,
      "y": -1.456810123046975
    },
    {
      "id": 47,
      "name": "Seasonal-worker and hospitality districts",
      "count": 2,
      "x": -1.92,
      "y": -1.876810123046975
    },
    {
      "id": 48,
      "name": "Wealthy retirement enclaves",
      "count": 2,
      "x": 3.9,
      "y": 1.903189876953025
    },
    {
      "id": 49,
      "name": "Remote island and fishing communities",
      "count": 2,
      "x": 0.52,
      "y": 2.463189876953025
    },
    {
      "id": 50,
      "name": "Upscale waterfront and marina districts",
      "count": 2,
      "x": 5.4,
      "y": -2.016810123046975
    }
  ],
  "economicCompression": {
    "origin": 2.15,
    "sourceMax": 5.75,
    "targetMax": 4.75,
    "scale": 0.7222222222222222
  },
  "center": [
    2.0,
    -0.19681012304697498
  ],
  "weights": [
    0.41125786895728933,
    0.2734878236831255,
    0.31525430735958515
  ],
  "means": [
    [
      3.4642267581522934,
      -0.20049498176725483
    ],
    [
      -1.4020929437915204,
      -0.2661854623528666
    ],
    [
      1.4642267581522932,
      0.37867297676123957
    ]
  ],
  "covariances": [
    [
      [
        1.833266341899672,
        0.8127119119827984
      ],
      [
        0.8127119119827984,
        4.982604539787757
      ]
    ],
    [
      [
        1.0000000186116198,
        -8.587214192816174e-09
      ],
      [
        -8.587214192816174e-09,
        1.0000000039755008
      ]
    ],
    [
      [
        34.229109668897074,
        17.724389068072174
      ],
      [
        17.724389068072174,
        85.24609948614636
      ]
    ]
  ],
  "gaussNodes": [
    -0.993128599185095,
    -0.9639719272779138,
    -0.912234428251326,
    -0.8391169718222188,
    -0.7463319064601508,
    -0.636053680726515,
    -0.5108670019508271,
    -0.37370608871541955,
    -0.22778585114164507,
    -0.07652652113349734,
    0.07652652113349734,
    0.22778585114164507,
    0.37370608871541955,
    0.5108670019508271,
    0.636053680726515,
    0.7463319064601508,
    0.8391169718222188,
    0.912234428251326,
    0.9639719272779138,
    0.993128599185095
  ],
  "gaussWeights": [
    0.017614007139150893,
    0.040601429800386446,
    0.06267204833410879,
    0.08327674157670471,
    0.1019301198172407,
    0.1181945319615186,
    0.1316886384491769,
    0.1420961093183824,
    0.14917298647260424,
    0.15275338713072628,
    0.15275338713072628,
    0.14917298647260424,
    0.1420961093183824,
    0.1316886384491769,
    0.1181945319615186,
    0.1019301198172407,
    0.08327674157670471,
    0.06267204833410879,
    0.040601429800386446,
    0.017614007139150893
  ],
  "baseline": [
    186,
    170,
    18,
    20,
    6,
    0,
    0,
    0,
    0
  ],
  "targets": [
    0.31,
    0.25,
    0.11,
    0.1,
    0.08,
    0.07,
    0.04,
    0.03,
    0.01
  ],
  "spread": 0.2,
  "prSeatCount": 400,
  "displayOrder": [
    8,
    7,
    2,
    4,
    1,
    0,
    3,
    6,
    5
  ],
  "baselinePr": [
    124,
    100,
    44,
    40,
    32,
    28,
    16,
    12,
    4
  ],
  "baselineCombined": [
    310,
    270,
    62,
    60,
    38,
    28,
    16,
    12,
    4
  ]
};
if(typeof module!=="undefined" && module.exports) module.exports=data;
else root.WizlandiaData=data;
})(typeof window!=="undefined"?window:globalThis);
