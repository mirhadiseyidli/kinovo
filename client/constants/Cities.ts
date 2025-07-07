export interface CityInfo {
  id: number;
  name: string;
  state: string;
  image: any; // For require() images or CDN URLs
  description: string;
}

export interface StateInfo {
  state: string;
  cities: CityInfo[];
}

export const CITIES_BY_STATE: StateInfo[] = [
  {
    state: 'California',
    cities: [
      { 
        id: 1, 
        name: 'Los Angeles', 
        state: 'California', 
        image: { uri: 'https://cdn.kinovo.app/cities/Los-Angeles.png' },
        description: 'City of Angels where dreams meet reality under endless sunshine'
      },
      { 
        id: 2, 
        name: 'San Diego', 
        state: 'California', 
        image: { uri: 'https://cdn.kinovo.app/cities/San-Diego.png' },
        description: 'America\'s Finest City with perfect weather and stunning beaches'
      },
      // { 
      //   id: 3, 
      //   name: 'San Jose', 
      //   state: 'California', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Silicon Valley\'s heart where innovation and culture collide'
      // },
      { 
        id: 4, 
        name: 'San Francisco', 
        state: 'California', 
        image: { uri: 'https://cdn.kinovo.app/cities/San-Francisco.png' },
        description: 'Fog-kissed hills and golden gates to endless adventures'
      },
    ]
  },
  {
    state: 'Texas',
    cities: [
      // { 
      //   id: 5, 
      //   name: 'Houston', 
      //   state: 'Texas', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Space City where Southern charm meets cosmic ambitions'
      // },
      // { 
      //   id: 6, 
      //   name: 'San Antonio', 
      //   state: 'Texas', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Where the Alamo\'s legacy meets vibrant River Walk culture'
      // },
      // { 
      //   id: 7, 
      //   name: 'Dallas', 
      //   state: 'Texas', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Big D energy with world-class dining and cowboy spirit'
      // },
      { 
        id: 8, 
        name: 'Austin', 
        state: 'Texas', 
        image: { uri: 'https://cdn.kinovo.app/cities/Austin.png' },
        description: 'Keep it weird in the live music capital of the world'
      },
    ]
  },
  {
    state: 'Florida',
    cities: [
      // { 
      //   id: 9, 
      //   name: 'Jacksonville', 
      //   state: 'Florida', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Bold city where beaches meet business in the Sunshine State'
      // },
      { 
        id: 10, 
        name: 'Miami', 
        state: 'Florida', 
        image: { uri: 'https://cdn.kinovo.app/cities/Miami.png' },
        description: 'Magic City of art deco glamour and Latin rhythms'
      },
      // { 
      //   id: 11, 
      //   name: 'Tampa', 
      //   state: 'Florida', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Bay area beauty with championship sports and cigar heritage'
      // },
      // { 
      //   id: 12, 
      //   name: 'Orlando', 
      //   state: 'Florida', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Theme park capital where magic happens every day'
      // },
    ]
  },
  {
    state: 'New York',
    cities: [
      { 
        id: 13, 
        name: 'New York City', 
        state: 'New York', 
        image: { uri: 'https://cdn.kinovo.app/cities/New-York-City.png' },
        description: 'The city that never sleeps in the center of the universe'
      },
    ]
  },
  {
    state: 'Illinois',
    cities: [
      { 
        id: 14, 
        name: 'Chicago', 
        state: 'Illinois', 
        image: { uri: 'https://cdn.kinovo.app/cities/Chicago.png' },
        description: 'Windy City with deep-dish pizza and towering architecture'
      },
    ]
  },
  // {
  //   state: 'Pennsylvania',
  //   cities: [
  //     { 
  //       id: 15, 
  //       name: 'Philadelphia', 
  //       state: 'Pennsylvania', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'City of Brotherly Love where American history was born'
  //     },
  //     { 
  //       id: 16, 
  //       name: 'Pittsburgh', 
  //       state: 'Pennsylvania', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Steel City transformed into a tech and healthcare powerhouse'
  //     },
  //   ]
  // },
  // {
  //   state: 'Ohio',
  //   cities: [
  //     { 
  //       id: 17, 
  //       name: 'Columbus', 
  //       state: 'Ohio', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Ohio\'s capital blend of college town energy and urban sophistication'
  //     },
  //     { 
  //       id: 18, 
  //       name: 'Cleveland', 
  //       state: 'Ohio', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Rock and Roll Hall of Fame city on beautiful Lake Erie'
  //     },
  //   ]
  // },
  // {
  //   state: 'Georgia',
  //   cities: [
  //     { 
  //       id: 19, 
  //       name: 'Atlanta', 
  //       state: 'Georgia', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Capital of the New South with Southern hospitality and urban flair'
  //     },
  //   ]
  // },
  // {
  //   state: 'North Carolina',
  //   cities: [
  //     { 
  //       id: 20, 
  //       name: 'Charlotte', 
  //       state: 'North Carolina', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Queen City rising with banking prowess and NASCAR thrills'
  //     },
  //   ]
  // },
  // {
  //   state: 'Michigan',
  //   cities: [
  //     { 
  //       id: 21, 
  //       name: 'Detroit', 
  //       state: 'Michigan', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Motor City renaissance with Motown soul and innovative spirit'
  //     },
  //     { 
  //       id: 22, 
  //       name: 'Ann Arbor', 
  //       state: 'Michigan', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'University town charm with Big Ten pride and academic excellence'
  //     },
  //   ]
  // },
  {
    state: 'Washington',
    cities: [
      { 
        id: 23, 
        name: 'Seattle', 
        state: 'Washington', 
        image: { uri: 'https://cdn.kinovo.app/cities/Seattle.png' },
        description: 'Emerald City where coffee culture meets tech innovation'
      },
    ]
  },
  // {
  //   state: 'Colorado',
  //   cities: [
  //     { 
  //       id: 24, 
  //       name: 'Denver', 
  //       state: 'Colorado', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Mile High City gateway to Rocky Mountain adventures'
  //     },
  //     { 
  //       id: 25, 
  //       name: 'Colorado Springs', 
  //       state: 'Colorado', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Olympic City beneath Pikes Peak\'s majestic shadow'
  //     },
  //   ]
  // },
  {
    state: 'Massachusetts',
    cities: [
      { 
        id: 26, 
        name: 'Boston', 
        state: 'Massachusetts', 
        image: { uri: 'https://cdn.kinovo.app/cities/Boston.png' },
        description: 'Beantown where revolutionary history meets championship sports'
      },
    ]
  },
  // {
  //   state: 'Tennessee',
  //   cities: [
  //     { 
  //       id: 27, 
  //       name: 'Nashville', 
  //       state: 'Tennessee', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Music City USA where country legends and honky-tonks reign'
  //     },
  //     { 
  //       id: 28, 
  //       name: 'Memphis', 
  //       state: 'Tennessee', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Home of the blues, birthplace of rock \'n\' roll'
  //     },
  //     { 
  //       id: 29, 
  //       name: 'Knoxville', 
  //       state: 'Tennessee', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Volunteer State gem with Smoky Mountain gateway charm'
  //     },
  //   ]
  // },
  // {
  //   state: 'Missouri',
  //   cities: [
  //     { 
  //       id: 30, 
  //       name: 'Kansas City', 
  //       state: 'Missouri', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'BBQ capital with jazz heritage and fountain-filled boulevards'
  //     },
  //     { 
  //       id: 31, 
  //       name: 'St. Louis', 
  //       state: 'Missouri', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Gateway to the West with iconic arch and Cardinals pride'
  //     },
  //   ]
  // },
  // {
  //   state: 'Oklahoma',
  //   cities: [
  //     { 
  //       id: 32, 
  //       name: 'Oklahoma City', 
  //       state: 'Oklahoma', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Thunder Country with oil heritage and cowboy culture'
  //     },
  //     { 
  //       id: 33, 
  //       name: 'Tulsa', 
  //       state: 'Oklahoma', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Oil Capital\'s art deco legacy and Green Country beauty'
  //     },
  //   ]
  // },
  {
    state: 'Nevada',
    cities: [
      { 
        id: 34, 
        name: 'Las Vegas', 
        state: 'Nevada', 
        image: { uri: 'https://cdn.kinovo.app/cities/Las-Vegas.png' },
        description: 'Sin City where what happens stays and dreams come alive'
      },
      // { 
      //   id: 35, 
      //   name: 'Reno', 
      //   state: 'Nevada', 
      //   image: require('@/assets/event-default.png'),
      //   description: 'Biggest Little City with Sierra Nevada mountain playground'
      // },
    ]
  },
  // {
  //   state: 'Maryland',
  //   cities: [
  //     { 
  //       id: 36, 
  //       name: 'Baltimore', 
  //       state: 'Maryland', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Charm City with Inner Harbor magic and crab cake perfection'
  //     },
  //   ]
  // },
  // {
  //   state: 'Indiana',
  //   cities: [
  //     { 
  //       id: 37, 
  //       name: 'Indianapolis', 
  //       state: 'Indiana', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Racing capital where the Indy 500 creates legendary moments'
  //     },
  //   ]
  // },
  // {
  //   state: 'Wisconsin',
  //   cities: [
  //     { 
  //       id: 38, 
  //       name: 'Milwaukee', 
  //       state: 'Wisconsin', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Brew City with lakefront beauty and cheese-loving pride'
  //     },
  //     { 
  //       id: 39, 
  //       name: 'Madison', 
  //       state: 'Wisconsin', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Isthmus city with Badger spirit and progressive charm'
  //     },
  //   ]
  // },
  // {
  //   state: 'Minnesota',
  //   cities: [
  //     { 
  //       id: 40, 
  //       name: 'Minneapolis', 
  //       state: 'Minnesota', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Mill City with 10,000 lakes and Prince\'s purple legacy'
  //     },
  //   ]
  // },
  // {
  //   state: 'Louisiana',
  //   cities: [
  //     { 
  //       id: 41, 
  //       name: 'New Orleans', 
  //       state: 'Louisiana', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Big Easy with jazz soul, Creole flavors, and Mardi Gras magic'
  //     },
  //   ]
  // },
  // {
  //   state: 'Alabama',
  //   cities: [
  //     { 
  //       id: 42, 
  //       name: 'Huntsville', 
  //       state: 'Alabama', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Rocket City where space dreams launch into reality'
  //     },
  //   ]
  // },
  // {
  //   state: 'Kentucky',
  //   cities: [
  //     { 
  //       id: 43, 
  //       name: 'Louisville', 
  //       state: 'Kentucky', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Derby City where bourbon flows and thoroughbreds race'
  //     },
  //   ]
  // },
  // {
  //   state: 'Nebraska',
  //   cities: [
  //     { 
  //       id: 44, 
  //       name: 'Omaha', 
  //       state: 'Nebraska', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Gateway to the West with steakhouse tradition and Warren Buffett wisdom'
  //     },
  //   ]
  // },
  // {
  //   state: 'Mississippi',
  //   cities: [
  //     { 
  //       id: 45, 
  //       name: 'Jackson', 
  //       state: 'Mississippi', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Magnolia State capital with deep Delta blues roots'
  //     },
  //   ]
  // },
  // {
  //   state: 'Iowa',
  //   cities: [
  //     { 
  //       id: 46, 
  //       name: 'Des Moines', 
  //       state: 'Iowa', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Insurance capital with Midwestern warmth and State Fair traditions'
  //     },
  //   ]
  // },
  // {
  //   state: 'Arkansas',
  //   cities: [
  //     { 
  //       id: 47, 
  //       name: 'Little Rock', 
  //       state: 'Arkansas', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Natural State capital with presidential history and Southern grace'
  //     },
  //   ]
  // },
  // {
  //   state: 'Kansas',
  //   cities: [
  //     { 
  //       id: 48, 
  //       name: 'Kansas City', 
  //       state: 'Kansas', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Sunflower State side with heartland values and Chiefs kingdom'
  //     },
  //   ]
  // },
  // {
  //   state: 'Connecticut',
  //   cities: [
  //     { 
  //       id: 49, 
  //       name: 'New Haven', 
  //       state: 'Connecticut', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Elm City home to Ivy League excellence and pizza perfection'
  //     },
  //   ]
  // },
  // {
  //   state: 'Oregon',
  //   cities: [
  //     { 
  //       id: 50, 
  //       name: 'Portland', 
  //       state: 'Oregon', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Keep Portland weird with craft beer, food trucks, and eco-conscious vibes'
  //     },
  //   ]
  // },
  // {
  //   state: 'Arizona',
  //   cities: [
  //     { 
  //       id: 51, 
  //       name: 'Phoenix', 
  //       state: 'Arizona', 
  //       image: require('@/assets/event-default.png'),
  //       description: 'Valley of the Sun with desert beauty and endless growth'
  //     },
  //   ]
  // },
];

// Flattened list of all cities for easy access
export const ALL_CITIES: CityInfo[] = CITIES_BY_STATE.flatMap(state => state.cities);

// Get cities by state name
export const getCitiesByState = (stateName: string): CityInfo[] => {
  const state = CITIES_BY_STATE.find(s => s.state === stateName);
  return state ? state.cities : [];
};

// Get city by name
export const getCityByName = (cityName: string): CityInfo | undefined => {
  return ALL_CITIES.find(city => city.name === cityName);
};

// Get state by city name
export const getStateByCity = (cityName: string): string | undefined => {
  const city = getCityByName(cityName);
  return city?.state;
};

// Get description by city name
export const getCityDescription = (cityName: string): string => {
  const city = getCityByName(cityName);
  return city?.description || 'Discover amazing events in this city';
};

// Get featured cities (the current ones shown in the UI)
export const getFeaturedCities = (): CityInfo[] => {
  return [
    getCityByName('San Francisco'),
    getCityByName('New York City'),
    getCityByName('Los Angeles'),
    getCityByName('Chicago'),
  ].filter(Boolean) as CityInfo[];
}; 