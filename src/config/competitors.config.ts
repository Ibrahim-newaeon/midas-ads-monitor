// src/config/competitors.config.ts

export type Competitor = {
  name: string;
  fbPageName: string;
  instagramHandle?: string;
  category: string;
  priority?: boolean;
};

export type Country = 'KSA' | 'Qatar' | 'Kuwait';
export type CountryCode = 'SA' | 'QA' | 'KW';

export const COUNTRY_CODES: Record<Country, CountryCode> = {
  KSA: 'SA',
  Qatar: 'QA',
  Kuwait: 'KW',
};

export const COMPETITORS: Record<Country, Competitor[]> = {
  KSA: [
    { name: 'IKEA Saudi Arabia',      fbPageName: 'IKEASaudiArabia',       instagramHandle: 'ikea_ksa',           category: 'mass-market', priority: true  },
    { name: 'Pan Emirates',           fbPageName: 'PanEmiratesFurniture',  instagramHandle: 'panemirates',        category: 'mid-range',   priority: true  },
    { name: 'Home Centre KSA',        fbPageName: 'homecentreSA',          instagramHandle: 'homecentreSA',       category: 'mid-range',   priority: true  },
    { name: 'Danube Home',            fbPageName: 'DanubeHome',            instagramHandle: 'danubehome',         category: 'mid-range'                   },
    { name: 'Marina Home',            fbPageName: 'MarinHomeInteriors',    instagramHandle: 'marinahome',         category: 'premium'                     },
    { name: 'Pottery Barn MENA',      fbPageName: 'PotteryBarnMENA',       instagramHandle: 'potterybarnmena',    category: 'premium'                     },
    { name: 'West Elm MENA',          fbPageName: 'WestElmMENA',           instagramHandle: 'westelmmena',        category: 'premium'                     },
    { name: 'BoConcept KSA',          fbPageName: 'BoConcept',             instagramHandle: 'boconcept',          category: 'premium'                     },
    { name: 'JYSK Saudi',             fbPageName: 'JYSKSaudi',             instagramHandle: 'jysksaudi',          category: 'mass-market'                 },
    { name: 'IDdesign',               fbPageName: 'IDdesignMENA',          instagramHandle: 'iddesignmena',       category: 'mid-range'                   },
    { name: 'Homes R Us',             fbPageName: 'HomesRUsOfficial',      instagramHandle: 'homesrusmena',       category: 'mid-range'                   },
    { name: 'The One KSA',            fbPageName: 'theonelifestyle',       instagramHandle: 'theonelifestyle',    category: 'premium'                     },
    { name: 'Restoration Hardware',   fbPageName: 'RHRestorationHardware', instagramHandle: 'restorationhardware',category: 'luxury'                      },
    { name: 'Crate & Barrel MENA',    fbPageName: 'CrateAndBarrelMENA',    instagramHandle: 'crateandbarrelmena', category: 'premium'                     },
    { name: 'Natuzzi Arabia',         fbPageName: 'NatuzziArabia',         instagramHandle: 'natuzzi',            category: 'luxury'                      },
    { name: 'Al Rugaib Furniture',    fbPageName: 'AlRugaibFurniture',     instagramHandle: 'alrugaib',           category: 'local'                       },
    { name: 'Hawa Furniture',         fbPageName: 'HawaFurnitureSA',       instagramHandle: 'hawafurniture',      category: 'local'                       },
    { name: 'Harveys Furniture',      fbPageName: 'HarveysFurnitureSA',    instagramHandle: 'harveysfurniture',   category: 'mid-range'                   },
    { name: 'Ashley Furniture KSA',   fbPageName: 'AshleyFurnitureSA',     instagramHandle: 'ashleyfurnitureSA',  category: 'mid-range'                   },
    { name: 'Kika Furniture KSA',     fbPageName: 'KikaFurnitureKSA',      instagramHandle: 'kikafurniture',      category: 'mass-market'                 },
  ],

  Qatar: [
    { name: 'IKEA Qatar',             fbPageName: 'IKEAQatar',             instagramHandle: 'ikea_qatar',         category: 'mass-market' },
    { name: 'Pan Emirates Qatar',     fbPageName: 'PanEmiratesQatar',      instagramHandle: 'panemirates',        category: 'mid-range'   },
    { name: 'Home Centre Qatar',      fbPageName: 'homecentreQatar',       instagramHandle: 'homecentreQatar',    category: 'mid-range'   },
    { name: 'Danube Home Qatar',      fbPageName: 'DanubeHomeQatar',       instagramHandle: 'danubehome',         category: 'mid-range'   },
    { name: 'Marina Home Qatar',      fbPageName: 'MarinHomeQatar',        instagramHandle: 'marinahome',         category: 'premium'     },
    { name: 'Pottery Barn Qatar',     fbPageName: 'PotteryBarnMENA',       instagramHandle: 'potterybarnmena',    category: 'premium'     },
    { name: 'West Elm Qatar',         fbPageName: 'WestElmMENA',           instagramHandle: 'westelmmena',        category: 'premium'     },
    { name: 'Homes R Us Qatar',       fbPageName: 'HomesRUsQatar',         instagramHandle: 'homesrusqatar',      category: 'mid-range'   },
    { name: 'The One Qatar',          fbPageName: 'theonelifestyle',       instagramHandle: 'theonelifestyle',    category: 'premium'     },
    { name: 'BoConcept Qatar',        fbPageName: 'BoConceptQatar',        instagramHandle: 'boconcept',          category: 'premium'     },
    { name: 'IDdesign Qatar',         fbPageName: 'IDdesignQatar',         instagramHandle: 'iddesignmena',       category: 'mid-range'   },
    { name: 'Crate & Barrel Qatar',   fbPageName: 'CrateAndBarrelMENA',    instagramHandle: 'crateandbarrelmena', category: 'premium'     },
    { name: 'Villaggio Home Qatar',   fbPageName: 'VillaggioHomeQatar',    instagramHandle: 'villaggiohome',      category: 'local'       },
    { name: 'Al Mana Furniture',      fbPageName: 'AlManaFurnitureQatar',  instagramHandle: 'almanafurniture',    category: 'local'       },
    { name: 'Doha Furniture',         fbPageName: 'DohaFurnitureQatar',    instagramHandle: 'dohafurniture',      category: 'local'       },
    { name: 'JYSK Qatar',             fbPageName: 'JYSKQatar',             instagramHandle: 'jysqatar',           category: 'mass-market' },
    { name: 'Ashley Furniture QA',    fbPageName: 'AshleyFurnitureQA',     instagramHandle: 'ashleyfurnitureqatar',category: 'mid-range' },
    { name: 'Harvest Home Qatar',     fbPageName: 'HarvestHomeQatar',      instagramHandle: 'harvesthome',        category: 'mid-range'   },
    { name: 'Natuzzi Qatar',          fbPageName: 'NatuzziQatar',          instagramHandle: 'natuzzi',            category: 'luxury'      },
    { name: 'Restoration Hardware',   fbPageName: 'RHRestorationHardware', instagramHandle: 'restorationhardware',category: 'luxury'      },
  ],

  Kuwait: [
    { name: 'IKEA Kuwait',            fbPageName: 'IKEAKuwait',            instagramHandle: 'ikea_kuwait',        category: 'mass-market' },
    { name: 'Pan Emirates Kuwait',    fbPageName: 'PanEmiratesKuwait',     instagramHandle: 'panemirates',        category: 'mid-range'   },
    { name: 'Home Centre Kuwait',     fbPageName: 'homecentreKuwait',      instagramHandle: 'homecentrekuwait',   category: 'mid-range'   },
    { name: 'Danube Home Kuwait',     fbPageName: 'DanubeHomeKuwait',      instagramHandle: 'danubehome',         category: 'mid-range'   },
    { name: 'Marina Home Kuwait',     fbPageName: 'MarinHomeKuwait',       instagramHandle: 'marinahomekw',       category: 'premium'     },
    { name: 'Homes R Us Kuwait',      fbPageName: 'HomesRUsKuwait',        instagramHandle: 'homesruskuwait',     category: 'mid-range'   },
    { name: 'The One Kuwait',         fbPageName: 'TheOneKuwait',          instagramHandle: 'theonekuwait',       category: 'premium'     },
    { name: 'IDdesign Kuwait',        fbPageName: 'IDdesignKuwait',        instagramHandle: 'iddesignmena',       category: 'mid-range'   },
    { name: 'BoConcept Kuwait',       fbPageName: 'BoConceptKuwait',       instagramHandle: 'boconcept',          category: 'premium'     },
    { name: 'JYSK Kuwait',            fbPageName: 'JYSKKuwait',            instagramHandle: 'jyskkuwait',         category: 'mass-market' },
    { name: 'Al Hamra Furniture',     fbPageName: 'AlHamraFurnitureKW',    instagramHandle: 'alhamrafurniture',   category: 'local'       },
    { name: 'Kuwait Furniture',       fbPageName: 'KuwaitFurnitureHouse',  instagramHandle: 'kuwaitfurniture',    category: 'local'       },
    { name: 'Ashley Furniture KW',    fbPageName: 'AshleyFurnitureKW',     instagramHandle: 'ashleyfurniturekw',  category: 'mid-range'   },
    { name: 'Natuzzi Kuwait',         fbPageName: 'NatuzziKuwait',         instagramHandle: 'natuzzi',            category: 'luxury'      },
    { name: 'Pottery Barn Kuwait',    fbPageName: 'PotteryBarnMENA',       instagramHandle: 'potterybarnmena',    category: 'premium'     },
    { name: 'West Elm Kuwait',        fbPageName: 'WestElmMENA',           instagramHandle: 'westelmmena',        category: 'premium'     },
    { name: 'Crate & Barrel KW',      fbPageName: 'CrateAndBarrelMENA',    instagramHandle: 'crateandbarrelmena', category: 'premium'     },
    { name: 'Naser Al-Bader',         fbPageName: 'NaserAlBaderKuwait',    instagramHandle: 'naserbader',         category: 'local'       },
    { name: 'Al Sayer Furniture',     fbPageName: 'AlSayerFurnitureKW',    instagramHandle: 'alsayerfurniture',   category: 'local'       },
    { name: 'Kika Furniture Kuwait',  fbPageName: 'KikaFurnitureKuwait',   instagramHandle: 'kikafurniture',      category: 'mass-market' },
  ],
};
