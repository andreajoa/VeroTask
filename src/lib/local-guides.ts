import type { PublicLocale } from "@/lib/site-copy";

/**
 * Hand-written local content for the service × city landing pages.
 * Facts are deliberately general and verifiable (neighborhood names, ZIP codes, county, Florida-wide rules).
 * Price ranges are planning estimates for Central Florida, never a VeroTask price: the Pro's quote sets the price.
 */

type Localized = Record<PublicLocale, string>;

export type CityPhoto = {
  src: string;
  width: number;
  height: number;
  credit: string;
  license: string;
  source: string;
  alt: Localized;
};

export type CityGuide = {
  county: string;
  zips: string[];
  areas: string[];
  photo: CityPhoto;
  intro: Localized;
  tips: Localized[];
};

export type PriceUnit = "job" | "hour" | "visit" | "month" | "item" | "room" | "home" | "turnover";

export type ServiceGuide = {
  price: { min: number; max: number; unit: PriceUnit };
  intro: Localized;
  florida: Localized;
  prep: Localized;
};

export const CITY_GUIDES: Record<string, CityGuide> = {
  "orlando-fl": {
    county: "Orange County",
    zips: ["32801", "32803", "32804", "32806", "32807", "32812", "32814", "32819", "32822", "32827", "32835", "32839"],
    areas: ["Downtown Orlando", "Thornton Park", "College Park", "Baldwin Park", "Audubon Park", "Delaney Park", "Conway", "Lake Nona", "Dr. Phillips", "MetroWest"],
    photo: {
      src: "/local/orlando-fl.webp", width: 2000, height: 1333, credit: "JER3L1337", license: "CC BY 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Lake_Eola_and_Orlando_Skyline_seen_in_2024.jpg",
      alt: { en: "Lake Eola fountain and the downtown Orlando skyline", "pt-br": "Fonte do Lake Eola e o skyline do centro de Orlando", es: "Fuente del lago Eola y el horizonte del centro de Orlando" }
    },
    intro: {
      en: "From the bungalows around Lake Eola and College Park to newer homes in Lake Nona and MetroWest, Orlando mixes 1920s houses with brand-new communities, so the same job can look very different from one ZIP code to the next.",
      "pt-br": "Das casas antigas ao redor do Lake Eola e de College Park às casas novas de Lake Nona e MetroWest, Orlando mistura imóveis dos anos 1920 com condomínios recém-construídos, então o mesmo serviço pode mudar bastante de um ZIP code para outro.",
      es: "Desde los bungalows alrededor del lago Eola y College Park hasta las casas nuevas de Lake Nona y MetroWest, Orlando combina viviendas de los años 1920 con comunidades recién construidas, así que el mismo trabajo puede variar mucho de un código postal a otro."
    },
    tips: [
      {
        en: "Older homes near Lake Eola, College Park and Delaney Park often still have original plumbing and wiring. Mention the home's age in your request so the Pro brings the right parts.",
        "pt-br": "Casas antigas perto do Lake Eola, College Park e Delaney Park muitas vezes ainda têm encanamento e fiação originais. Informe a idade do imóvel no pedido para o Pro levar as peças certas.",
        es: "Las casas antiguas cerca del lago Eola, College Park y Delaney Park a menudo conservan tuberías y cableado originales. Indica la antigüedad de la vivienda para que el Pro traiga las piezas correctas."
      },
      {
        en: "Planned communities such as Baldwin Park and Lake Nona usually have HOA rules on exterior work and contractor hours. Check them before booking painting, pressure washing or yard work.",
        "pt-br": "Bairros planejados como Baldwin Park e Lake Nona costumam ter regras de HOA para obras externas e horários de prestadores. Confira antes de reservar pintura, lavagem de alta pressão ou jardinagem.",
        es: "Comunidades planificadas como Baldwin Park y Lake Nona suelen tener reglas de HOA sobre trabajos exteriores y horarios de contratistas. Revísalas antes de reservar pintura, lavado a presión o jardinería."
      }
    ]
  },
  "winter-park-fl": {
    county: "Orange County",
    zips: ["32789", "32792"],
    areas: ["Park Avenue district", "Hannibal Square", "Olde Winter Park", "Winter Park Pines", "Aloma", "Lakemont", "Chain of Lakes"],
    photo: {
      src: "/local/winter-park-fl.webp", width: 2000, height: 1500, credit: "Ebyabe", license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Winter_Park_Interlachen_Avenue_HD_231_bldg02.jpg",
      alt: { en: "Historic home on Interlachen Avenue in Winter Park", "pt-br": "Casa histórica na Interlachen Avenue, em Winter Park", es: "Casa histórica en Interlachen Avenue, Winter Park" }
    },
    intro: {
      en: "Winter Park is known for brick streets, the Chain of Lakes and a heavy live-oak canopy. Many homes are historic or custom-built, which makes careful, detail-oriented work more important than speed.",
      "pt-br": "Winter Park é conhecida pelas ruas de tijolo, pela Chain of Lakes e pela copa densa de carvalhos. Muitas casas são históricas ou feitas sob medida, então capricho e cuidado importam mais que rapidez.",
      es: "Winter Park es conocida por sus calles de ladrillo, la Chain of Lakes y la densa copa de robles. Muchas casas son históricas o hechas a medida, por lo que el trabajo cuidadoso importa más que la rapidez."
    },
    tips: [
      {
        en: "The oak canopy drops leaves, moss and pollen year-round, so gutters, roofs, pool screens and driveways need attention more often than in newer suburbs.",
        "pt-br": "Os carvalhos soltam folhas, musgo e pólen o ano todo, então calhas, telhados, telas de piscina e garagens precisam de atenção com mais frequência do que em bairros novos.",
        es: "Los robles sueltan hojas, musgo y polen todo el año, por lo que canaletas, techos, mallas de piscina y entradas necesitan atención más seguido que en suburbios nuevos."
      },
      {
        en: "Exterior changes to designated historic properties can require review by the city's Historic Preservation Board. Confirm before planning paint colors or exterior repairs.",
        "pt-br": "Mudanças externas em imóveis históricos tombados podem exigir análise do Historic Preservation Board da cidade. Confirme antes de escolher cores de pintura ou reparos externos.",
        es: "Los cambios exteriores en propiedades históricas designadas pueden requerir revisión del Historic Preservation Board de la ciudad. Confírmalo antes de elegir colores o reparaciones exteriores."
      }
    ]
  },
  "kissimmee-fl": {
    county: "Osceola County",
    zips: ["34741", "34743", "34744", "34746", "34747"],
    areas: ["Downtown Kissimmee", "Lakefront Park area", "Buenaventura Lakes", "Remington", "Poinciana", "US-192 corridor", "Four Corners"],
    photo: {
      src: "/local/kissimmee-fl.webp", width: 2000, height: 1003, credit: "Chad Sparkes", license: "CC BY 2.0",
      source: "https://commons.wikimedia.org/wiki/File:Kissimmee_Lakefront_Sunrise_(19054207665).jpg",
      alt: { en: "Sunrise over Lake Tohopekaliga at the Kissimmee Lakefront", "pt-br": "Nascer do sol no Lake Tohopekaliga, no lakefront de Kissimmee", es: "Amanecer sobre el lago Tohopekaliga en el frente del lago de Kissimmee" }
    },
    intro: {
      en: "Kissimmee sits on Lake Tohopekaliga and next to the busiest vacation-home market in Florida. Family homes in Buenaventura Lakes and Remington share the area with thousands of short-term rentals along US-192.",
      "pt-br": "Kissimmee fica às margens do Lake Tohopekaliga e ao lado do maior mercado de casas de temporada da Flórida. Casas de família em Buenaventura Lakes e Remington dividem a região com milhares de aluguéis de temporada ao longo da US-192.",
      es: "Kissimmee está junto al lago Tohopekaliga y al lado del mercado de casas vacacionales más activo de Florida. Las casas familiares de Buenaventura Lakes y Remington comparten la zona con miles de alquileres de corta estancia a lo largo de la US-192."
    },
    tips: [
      {
        en: "Short-term rentals near US-192 usually run on same-day turnovers between check-out and check-in. Put both times in your request so only Pros who can meet the window respond.",
        "pt-br": "Casas de temporada perto da US-192 costumam ter troca de hóspedes no mesmo dia, entre check-out e check-in. Informe os dois horários no pedido para responderem só Pros que cumprem a janela.",
        es: "Los alquileres cerca de la US-192 suelen tener cambios el mismo día entre check-out y check-in. Indica ambos horarios para que solo respondan Pros que puedan cumplir la ventana."
      },
      {
        en: "Lakeside humidity speeds up mildew on screens, lanais and driveways. Many owners pair cleaning with pressure washing a few times a year.",
        "pt-br": "A umidade perto do lago acelera o mofo em telas, lanais e garagens. Muitos proprietários combinam limpeza com lavagem de alta pressão algumas vezes por ano.",
        es: "La humedad junto al lago acelera el moho en mallas, lanais y entradas. Muchos propietarios combinan la limpieza con lavado a presión varias veces al año."
      }
    ]
  },
  "davenport-fl": {
    county: "Polk County",
    zips: ["33837", "33896", "33897"],
    areas: ["ChampionsGate", "Four Corners", "Providence", "Solterra", "Highlands Reserve", "Historic Downtown Davenport"],
    photo: {
      src: "/local/davenport-fl.webp", width: 2000, height: 1329, credit: "Allen Paschel", license: "CC BY 3.0",
      source: "https://commons.wikimedia.org/wiki/File:Davenport,_Florida-City-Hall.jpg",
      alt: { en: "Historic Davenport City Hall in Davenport, Florida", "pt-br": "Prefeitura histórica de Davenport, na Flórida", es: "Ayuntamiento histórico de Davenport, Florida" }
    },
    intro: {
      en: "Davenport grew fast around ChampionsGate, Solterra and the Four Corners area, where many homes are vacation villas with private pools managed from out of state, next to a small historic downtown.",
      "pt-br": "Davenport cresceu rápido ao redor de ChampionsGate, Solterra e da região de Four Corners, onde muitas casas são vilas de temporada com piscina privativa administradas de fora do estado, ao lado de um pequeno centro histórico.",
      es: "Davenport creció rápido alrededor de ChampionsGate, Solterra y Four Corners, donde muchas casas son villas vacacionales con piscina privada administradas desde fuera del estado, junto a un pequeño centro histórico."
    },
    tips: [
      {
        en: "Most resort communities are gated. Add the gate code or guest-registration steps to your request so the Pro is not turned away at the entrance.",
        "pt-br": "A maioria dos condomínios de resort é fechada. Inclua o código do portão ou o cadastro de visitante no pedido para o Pro não ser barrado na entrada.",
        es: "La mayoría de las comunidades resort tienen portón. Agrega el código o el registro de visitante para que el Pro no sea rechazado en la entrada."
      },
      {
        en: "New-construction villas often need a full set-up before the first guests: furniture assembly, TV mounting, smart locks and a deep clean.",
        "pt-br": "Vilas recém-construídas muitas vezes precisam de montagem completa antes dos primeiros hóspedes: móveis, TV na parede, fechaduras inteligentes e limpeza pesada.",
        es: "Las villas nuevas a menudo necesitan una preparación completa antes de los primeros huéspedes: muebles, TV en la pared, cerraduras inteligentes y limpieza profunda."
      }
    ]
  },
  "celebration-fl": {
    county: "Osceola County",
    zips: ["34747"],
    areas: ["Market Street / Downtown", "North Village", "South Village", "West Village", "Artisan Park", "Island Village"],
    photo: {
      src: "/local/celebration-fl.webp", width: 2000, height: 1333, credit: "Michael Rivera", license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Market_St,_Celebration.jpg",
      alt: { en: "Market Street in downtown Celebration, Florida", "pt-br": "Market Street, no centro de Celebration, Flórida", es: "Market Street en el centro de Celebration, Florida" }
    },
    intro: {
      en: "Celebration is a master-planned town with front porches, narrow lots and a walkable downtown around Market Street. Homes follow shared design standards, so exterior work has to fit the community's look.",
      "pt-br": "Celebration é uma cidade planejada, com varandas na frente, lotes estreitos e um centro caminhável ao redor da Market Street. As casas seguem padrões de design em comum, então obras externas precisam combinar com o visual da comunidade.",
      es: "Celebration es un pueblo planificado con porches al frente, lotes estrechos y un centro caminable alrededor de Market Street. Las casas siguen estándares de diseño comunes, así que los trabajos exteriores deben encajar con el estilo de la comunidad."
    },
    tips: [
      {
        en: "Exterior changes such as paint colors, fences and landscaping generally need approval from the Celebration Residential Owners Association. Get it before booking the job.",
        "pt-br": "Mudanças externas como cor de pintura, cercas e paisagismo geralmente precisam de aprovação da Celebration Residential Owners Association. Consiga antes de reservar o serviço.",
        es: "Los cambios exteriores como colores de pintura, cercas y paisajismo generalmente requieren aprobación de la Celebration Residential Owners Association. Obténla antes de reservar."
      },
      {
        en: "Many homes have rear alleys and detached garages. Tell the Pro where to park and which entrance to use.",
        "pt-br": "Muitas casas têm vielas nos fundos e garagens separadas. Diga ao Pro onde estacionar e qual entrada usar.",
        es: "Muchas casas tienen callejones traseros y garajes separados. Indica al Pro dónde estacionar y qué entrada usar."
      }
    ]
  },
  "clermont-fl": {
    county: "Lake County",
    zips: ["34711", "34714", "34715"],
    areas: ["Downtown Clermont", "Waterfront Park", "Kings Ridge", "Legends", "Hartwood Marsh", "Sugarloaf Mountain area"],
    photo: {
      src: "/local/clermont-fl.webp", width: 2000, height: 1500, credit: "Ebyabe", license: "CC BY-SA 3.0",
      source: "https://commons.wikimedia.org/wiki/File:Clermont_FL_Lake_Minneola01.jpg",
      alt: { en: "Lake Minneola seen from the shore in Clermont", "pt-br": "Lake Minneola visto da margem, em Clermont", es: "El lago Minneola visto desde la orilla en Clermont" }
    },
    intro: {
      en: "Clermont has rolling hills, sandy soil and the Chain of Lakes around Lake Minneola, which is unusual for Florida. Larger lots and sloped yards change how lawn, irrigation and exterior jobs are done.",
      "pt-br": "Clermont tem morros, solo arenoso e a Chain of Lakes ao redor do Lake Minneola, algo raro na Flórida. Lotes maiores e quintais em declive mudam a forma de fazer gramado, irrigação e serviços externos.",
      es: "Clermont tiene colinas, suelo arenoso y la Chain of Lakes alrededor del lago Minneola, algo poco común en Florida. Los lotes grandes y los patios en pendiente cambian cómo se hacen el césped, el riego y los trabajos exteriores."
    },
    tips: [
      {
        en: "Sandy soil drains fast, so lawns here depend on well-tuned irrigation. Mention slopes and sprinkler zones when requesting lawn care.",
        "pt-br": "O solo arenoso drena rápido, então o gramado depende de uma irrigação bem regulada. Informe declives e zonas de sprinkler ao pedir jardinagem.",
        es: "El suelo arenoso drena rápido, así que el césped depende de un riego bien ajustado. Menciona pendientes y zonas de aspersores al pedir jardinería."
      },
      {
        en: "Communities in South Lake County sit farther from Orlando. Flexible time windows help nearby Pros fit your job into their route.",
        "pt-br": "Os bairros do sul do condado de Lake ficam mais longe de Orlando. Janelas de horário flexíveis ajudam Pros próximos a encaixar seu serviço na rota.",
        es: "Las comunidades del sur del condado de Lake están más lejos de Orlando. Horarios flexibles ayudan a que Pros cercanos incluyan tu trabajo en su ruta."
      }
    ]
  },
  "winter-garden-fl": {
    county: "Orange County",
    zips: ["34787"],
    areas: ["Historic Downtown (Plant Street)", "Horizon West", "Hamlin", "Stoneybrook West", "Summerlake", "Lakeside"],
    photo: {
      src: "/local/winter-garden-fl.webp", width: 2000, height: 1333, credit: "Freeholdman12", license: "CC BY 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Downtown_Winter_Garden_(Plant_Street_-_June_10,_2024).jpg",
      alt: { en: "Clock tower on Plant Street in historic downtown Winter Garden", "pt-br": "Torre do relógio na Plant Street, centro histórico de Winter Garden", es: "Torre del reloj en Plant Street, centro histórico de Winter Garden" }
    },
    intro: {
      en: "Winter Garden pairs a historic downtown on Plant Street and the West Orange Trail with some of the fastest-growing neighborhoods in the region in Horizon West and Hamlin.",
      "pt-br": "Winter Garden une o centro histórico da Plant Street e a West Orange Trail a alguns dos bairros que mais crescem na região, em Horizon West e Hamlin.",
      es: "Winter Garden combina el centro histórico de Plant Street y la West Orange Trail con algunos de los vecindarios de mayor crecimiento de la región en Horizon West y Hamlin."
    },
    tips: [
      {
        en: "Move-ins are constant in Horizon West. Bundling furniture assembly, TV mounting and a move-in clean into one request saves scheduling time.",
        "pt-br": "Mudanças são constantes em Horizon West. Juntar montagem de móveis, TV na parede e limpeza de mudança em um só pedido economiza tempo de agenda.",
        es: "Las mudanzas son constantes en Horizon West. Combinar montaje de muebles, TV en la pared y limpieza de mudanza en una sola solicitud ahorra tiempo."
      },
      {
        en: "New-build warranties sometimes limit who can work on HVAC or plumbing. Check your builder warranty before booking those trades.",
        "pt-br": "Garantias de construtora às vezes limitam quem pode mexer em ar-condicionado ou encanamento. Confira a garantia antes de reservar esses serviços.",
        es: "Las garantías de construcción a veces limitan quién puede trabajar en HVAC o plomería. Revisa tu garantía antes de reservar esos oficios."
      }
    ]
  },
  "lake-buena-vista-fl": {
    county: "Orange County",
    zips: ["32830", "32836"],
    areas: ["Palm Parkway", "Vineland Avenue corridor", "Hotel Plaza Boulevard area", "Dr. Phillips edge", "Resort condo communities"],
    photo: {
      src: "/local/lake-buena-vista-fl.webp", width: 2000, height: 1500, credit: "Aeapart", license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Wyndham_hotel_resort_at_lake_buena_vistas.jpg",
      alt: { en: "Resort lake with a fountain at dusk in Lake Buena Vista", "pt-br": "Lago de resort com fonte ao entardecer em Lake Buena Vista", es: "Lago de un resort con fuente al atardecer en Lake Buena Vista" }
    },
    intro: {
      en: "Lake Buena Vista is mostly resorts, condo communities and vacation rentals close to the theme parks, so many jobs are for owners and managers who are not on site.",
      "pt-br": "Lake Buena Vista é formada principalmente por resorts, condomínios e casas de temporada perto dos parques, então muitos serviços são para proprietários e administradores que não estão no local.",
      es: "Lake Buena Vista está formada sobre todo por resorts, condominios y alquileres vacacionales cerca de los parques, así que muchos trabajos son para propietarios y administradores que no están en el lugar."
    },
    tips: [
      {
        en: "Condo associations often require vendors to check in at the front desk or security. Include those steps and the unit number in the request.",
        "pt-br": "Condomínios costumam exigir que prestadores se identifiquem na recepção ou na segurança. Inclua esse passo e o número da unidade no pedido.",
        es: "Las asociaciones de condominio suelen exigir que los proveedores se registren en recepción o seguridad. Incluye ese paso y el número de unidad."
      },
      {
        en: "If you manage remotely, ask for completion photos. VeroTask bookings support photo evidence at the end of the job.",
        "pt-br": "Se você administra a distância, peça fotos de conclusão. As reservas da VeroTask aceitam fotos como evidência no fim do serviço.",
        es: "Si administras a distancia, pide fotos al terminar. Las reservas de VeroTask admiten fotos como evidencia al final del trabajo."
      }
    ]
  },
  "windermere-fl": {
    county: "Orange County",
    zips: ["34786"],
    areas: ["Town of Windermere", "Butler Chain of Lakes", "Isleworth", "Keene's Pointe", "Lake Butler Sound", "Lake Down"],
    photo: {
      src: "/local/windermere-fl.webp", width: 2000, height: 1500, credit: "Town of Windermere", license: "Public domain",
      source: "https://commons.wikimedia.org/wiki/File:Lake_Down_Park.jpg",
      alt: { en: "Lake Down Park in the Town of Windermere", "pt-br": "Lake Down Park, na cidade de Windermere", es: "Lake Down Park en el pueblo de Windermere" }
    },
    intro: {
      en: "Windermere is built around the Butler Chain of Lakes, with larger lakefront lots, docks, screened lanais and several gated communities such as Isleworth and Keene's Pointe.",
      "pt-br": "Windermere foi construída ao redor da Butler Chain of Lakes, com lotes maiores à beira do lago, píeres, lanais telados e vários condomínios fechados como Isleworth e Keene's Pointe.",
      es: "Windermere está construida alrededor de la Butler Chain of Lakes, con lotes grandes frente al lago, muelles, lanais con malla y varias comunidades cerradas como Isleworth y Keene's Pointe."
    },
    tips: [
      {
        en: "Gated communities usually need the Pro's name registered in advance. Add it to the booking notes once you accept a quote.",
        "pt-br": "Condomínios fechados geralmente exigem o nome do Pro cadastrado com antecedência. Adicione nas observações da reserva depois de aceitar o orçamento.",
        es: "Las comunidades cerradas suelen exigir registrar el nombre del Pro con anticipación. Agrégalo a las notas de la reserva después de aceptar la cotización."
      },
      {
        en: "Lakefront homes carry more exterior surface: docks, seawalls, lanais and pool cages. Describe them so the quote covers the whole job.",
        "pt-br": "Casas à beira do lago têm mais área externa: píeres, muros de contenção, lanais e telas de piscina. Descreva tudo para o orçamento cobrir o serviço inteiro.",
        es: "Las casas frente al lago tienen más superficie exterior: muelles, muros de contención, lanais y jaulas de piscina. Descríbelos para que la cotización cubra todo."
      }
    ]
  },
  "st-cloud-fl": {
    county: "Osceola County",
    zips: ["34769", "34771", "34772"],
    areas: ["Downtown St. Cloud (New York Ave)", "East Lake Toho lakefront", "Harmony", "Stevens Plantation", "Canoe Creek", "Narcoossee corridor"],
    photo: {
      src: "/local/st-cloud-fl.webp", width: 2000, height: 1500, credit: "Ebyabe", license: "CC BY-SA 3.0",
      source: "https://commons.wikimedia.org/wiki/File:St_Cloud_FL_Peoples_Bank02.jpg",
      alt: { en: "Historic Peoples Bank building in downtown St. Cloud", "pt-br": "Prédio histórico do Peoples Bank no centro de St. Cloud", es: "Edificio histórico del Peoples Bank en el centro de St. Cloud" }
    },
    intro: {
      en: "St. Cloud keeps a small-town downtown on the shore of East Lake Toho while new neighborhoods grow along Narcoossee Road and in Harmony. Lots are often larger than in Orlando.",
      "pt-br": "St. Cloud mantém um centro de cidade pequena às margens do East Lake Toho, enquanto bairros novos crescem ao longo da Narcoossee Road e em Harmony. Os lotes costumam ser maiores que em Orlando.",
      es: "St. Cloud conserva un centro de pueblo pequeño a orillas del East Lake Toho mientras crecen nuevos vecindarios a lo largo de Narcoossee Road y en Harmony. Los lotes suelen ser más grandes que en Orlando."
    },
    tips: [
      {
        en: "Bigger yards mean longer mowing and more fence, driveway and patio area. Share the approximate lot size to get an accurate quote.",
        "pt-br": "Quintais maiores significam mais tempo de corte e mais área de cerca, garagem e pátio. Informe o tamanho aproximado do lote para receber um orçamento preciso.",
        es: "Patios más grandes significan más tiempo de corte y más área de cercas, entradas y patios. Indica el tamaño aproximado del lote para una cotización precisa."
      },
      {
        en: "Rural edges of St. Cloud may be on well water and septic systems. Say so when booking plumbing or water-related work.",
        "pt-br": "As áreas mais afastadas de St. Cloud podem usar poço artesiano e fossa séptica. Informe isso ao reservar encanamento ou serviços ligados a água.",
        es: "Las zonas rurales de St. Cloud pueden tener pozo de agua y sistema séptico. Indícalo al reservar plomería o trabajos relacionados con agua."
      }
    ]
  }
};

const FLORIDA_WIDE: Localized[] = [
  {
    en: "Hurricane season runs June 1 to November 30. Exterior, roof and tree work books up fast before and after storms, so request early when a system is forecast.",
    "pt-br": "A temporada de furacões vai de 1º de junho a 30 de novembro. Serviços externos, de telhado e de árvores lotam antes e depois de tempestades, então peça com antecedência quando houver previsão.",
    es: "La temporada de huracanes va del 1 de junio al 30 de noviembre. Los trabajos exteriores, de techo y de árboles se llenan antes y después de las tormentas, así que solicita con tiempo cuando haya pronóstico."
  },
  {
    en: "From May to September, afternoon thunderstorms are almost daily. Morning time slots are the safest for outdoor jobs.",
    "pt-br": "De maio a setembro, as tempestades de fim de tarde são quase diárias. Horários pela manhã são os mais seguros para serviços ao ar livre.",
    es: "De mayo a septiembre, las tormentas de la tarde son casi diarias. Los horarios de la mañana son los más seguros para trabajos al aire libre."
  }
];

const g = (en: string, pt: string, es: string): Localized => ({ en, "pt-br": pt, es });

export const SERVICE_GUIDES: Record<string, ServiceGuide> = {
  "vacation-rental-cleaning": {
    price: { min: 90, max: 220, unit: "turnover" },
    intro: g("Turnover cleaning between guests: linens, bathrooms, kitchen reset, trash and a restock check, done inside the check-out to check-in window.",
      "Limpeza de troca entre hóspedes: roupa de cama, banheiros, cozinha, lixo e conferência de reposição, feita dentro da janela entre check-out e check-in.",
      "Limpieza entre huéspedes: ropa de cama, baños, cocina, basura y revisión de reposición, dentro de la ventana entre check-out y check-in."),
    florida: g("Central Florida rentals see heavy pool and lanai use, so ask whether the turnover includes the lanai, grill and pool-area furniture.",
      "Casas de temporada na Flórida Central usam muito a piscina e o lanai, então pergunte se a limpeza inclui lanai, churrasqueira e móveis da área da piscina.",
      "Los alquileres en Florida Central usan mucho la piscina y el lanai, así que pregunta si la limpieza incluye lanai, parrilla y muebles del área de piscina."),
    prep: g("Share bedrooms, bathrooms, linen setup and the exact check-out and check-in times.",
      "Informe quartos, banheiros, como fica a roupa de cama e os horários exatos de check-out e check-in.",
      "Indica habitaciones, baños, la ropa de cama y los horarios exactos de check-out y check-in.")
  },
  "house-cleaning": {
    price: { min: 120, max: 250, unit: "visit" },
    intro: g("Recurring or one-time cleaning of kitchens, bathrooms, floors, dusting and surfaces for occupied homes.",
      "Limpeza recorrente ou avulsa de cozinha, banheiros, pisos, poeira e superfícies em casas habitadas.",
      "Limpieza recurrente o única de cocina, baños, pisos, polvo y superficies en casas habitadas."),
    florida: g("Humidity makes bathroom grout and AC vents collect mildew faster; mention them if you want them included.",
      "A umidade faz rejuntes de banheiro e saídas de ar-condicionado acumularem mofo mais rápido; mencione se quiser incluí-los.",
      "La humedad hace que las juntas del baño y las rejillas del aire acumulen moho más rápido; menciónalas si quieres incluirlas."),
    prep: g("Share square footage, bedrooms and bathrooms, pets and how often you want the service.",
      "Informe metragem, quartos, banheiros, animais e com que frequência quer o serviço.",
      "Indica los pies cuadrados, habitaciones, baños, mascotas y la frecuencia deseada.")
  },
  "deep-cleaning": {
    price: { min: 220, max: 480, unit: "job" },
    intro: g("Top-to-bottom cleaning for move-in, move-out or post-renovation: inside appliances, baseboards, cabinets and fixtures.",
      "Limpeza completa para entrada, saída ou pós-obra: dentro de eletrodomésticos, rodapés, armários e acabamentos.",
      "Limpieza completa para mudanza o después de una remodelación: dentro de electrodomésticos, zócalos, gabinetes y accesorios."),
    florida: g("Post-construction dust and pollen season (roughly February to May) both add time; say which applies.",
      "Poeira de obra e a temporada de pólen (mais ou menos de fevereiro a maio) aumentam o tempo; diga qual se aplica.",
      "El polvo de obra y la temporada de polen (aproximadamente de febrero a mayo) agregan tiempo; indica cuál aplica."),
    prep: g("Say whether the home is empty, list appliances to clean inside and any stains or build-up.",
      "Diga se a casa está vazia, liste os eletrodomésticos para limpar por dentro e manchas ou acúmulos.",
      "Indica si la casa está vacía, qué electrodomésticos limpiar por dentro y manchas o acumulaciones.")
  },
  "pool-service": {
    price: { min: 100, max: 180, unit: "month" },
    intro: g("Weekly pool service: chemical balance, skimming, brushing, filter and basket checks.",
      "Manutenção semanal de piscina: equilíbrio químico, limpeza da superfície, escovação e verificação de filtro e cestos.",
      "Mantenimiento semanal de piscina: balance químico, limpieza de superficie, cepillado y revisión de filtro y canastas."),
    florida: g("Pools are used year-round here and summer heat plus rain can turn water green within days, so weekly visits are the norm.",
      "Aqui a piscina é usada o ano todo, e o calor com chuva do verão pode deixar a água verde em poucos dias, por isso visitas semanais são o padrão.",
      "Aquí la piscina se usa todo el año y el calor con lluvia del verano puede poner el agua verde en pocos días, por eso las visitas semanales son lo normal."),
    prep: g("Share pool size, screened or open, salt or chlorine, and any spa attached.",
      "Informe tamanho da piscina, se é telada ou aberta, se é de sal ou cloro e se tem spa.",
      "Indica el tamaño, si tiene malla o es abierta, si es de sal o cloro y si tiene spa.")
  },
  hvac: {
    price: { min: 90, max: 150, unit: "visit" },
    intro: g("AC diagnostics, seasonal tune-ups, drain-line clearing and repairs for central air systems.",
      "Diagnóstico de ar-condicionado, manutenção sazonal, desentupimento do dreno e reparos em sistemas centrais.",
      "Diagnóstico de aire acondicionado, mantenimiento de temporada, limpieza de la línea de drenaje y reparaciones de sistemas centrales."),
    florida: g("In Florida, HVAC work beyond basic maintenance requires a state-licensed contractor; ask for the DBPR license number. A spring tune-up before summer prevents most emergency calls.",
      "Na Flórida, serviços de ar-condicionado além da manutenção básica exigem empresa com licença estadual; peça o número da licença DBPR. Uma revisão na primavera evita a maioria das emergências no verão.",
      "En Florida, los trabajos de HVAC más allá del mantenimiento básico requieren un contratista con licencia estatal; pide el número de licencia DBPR. Una revisión en primavera evita la mayoría de las emergencias de verano."),
    prep: g("Share the system age, symptoms (warm air, leaks, noise) and thermostat readings.",
      "Informe a idade do sistema, os sintomas (ar quente, vazamento, barulho) e o que o termostato mostra.",
      "Indica la antigüedad del sistema, los síntomas (aire caliente, fugas, ruido) y la lectura del termostato.")
  },
  plumbing: {
    price: { min: 150, max: 450, unit: "job" },
    intro: g("Leaks, clogs, water heaters, fixtures and toilet repairs.",
      "Vazamentos, entupimentos, aquecedores de água, torneiras e reparos de vaso sanitário.",
      "Fugas, atascos, calentadores de agua, grifería y reparaciones de inodoros."),
    florida: g("Florida requires a state plumbing license for plumbing work. Central Florida water is hard, so scale build-up in water heaters and faucets is common.",
      "A Flórida exige licença estadual de encanador para serviços de encanamento. A água da Flórida Central é dura, então acúmulo de calcário em aquecedores e torneiras é comum.",
      "Florida exige licencia estatal de plomería para trabajos de plomería. El agua de Florida Central es dura, así que la acumulación de sarro en calentadores y grifos es común."),
    prep: g("Describe where the problem is, how long it has been happening and whether water is shut off.",
      "Descreva onde está o problema, há quanto tempo acontece e se a água está fechada.",
      "Describe dónde está el problema, desde cuándo ocurre y si el agua está cerrada.")
  },
  handyman: {
    price: { min: 65, max: 120, unit: "hour" },
    intro: g("Small repairs and odd jobs: drywall patches, doors, shelves, caulking, fixtures and punch lists.",
      "Pequenos reparos e serviços gerais: remendos em drywall, portas, prateleiras, vedação, acabamentos e listas de pendências.",
      "Pequeñas reparaciones y trabajos varios: parches de drywall, puertas, repisas, sellado, accesorios y listas de pendientes."),
    florida: g("A handyman in Florida cannot perform work that needs a licensed trade, such as new electrical circuits, plumbing lines or structural work.",
      "Um faz-tudo na Flórida não pode fazer serviços que exigem profissão licenciada, como novos circuitos elétricos, tubulação ou obras estruturais.",
      "Un handyman en Florida no puede hacer trabajos que requieren un oficio con licencia, como circuitos eléctricos nuevos, tuberías u obras estructurales."),
    prep: g("List every task with photos if possible; a clear list makes an hourly quote accurate.",
      "Liste cada tarefa, com fotos se possível; uma lista clara deixa o orçamento por hora preciso.",
      "Enumera cada tarea, con fotos si es posible; una lista clara hace precisa la cotización por hora.")
  },
  "furniture-assembly": {
    price: { min: 60, max: 180, unit: "item" },
    intro: g("Assembly of beds, dressers, desks, cribs, patio sets and flat-pack furniture.",
      "Montagem de camas, cômodas, escrivaninhas, berços, conjuntos de área externa e móveis desmontados.",
      "Montaje de camas, cómodas, escritorios, cunas, juegos de patio y muebles desarmados."),
    florida: g("Outdoor and lanai furniture should be anchored or stored for storms; ask the Pro to note which pieces can be secured.",
      "Móveis de área externa e lanai devem ser presos ou guardados em tempestades; peça ao Pro para indicar quais peças podem ser fixadas.",
      "Los muebles de exterior y lanai deben anclarse o guardarse en tormentas; pide al Pro que indique qué piezas pueden asegurarse."),
    prep: g("Share the brand, model and number of boxes for each item.",
      "Informe marca, modelo e número de caixas de cada item.",
      "Indica la marca, el modelo y el número de cajas de cada artículo.")
  },
  mounting: {
    price: { min: 80, max: 200, unit: "job" },
    intro: g("Mounting shelves, mirrors, art, curtain rods and wall organizers securely into studs or masonry.",
      "Instalação de prateleiras, espelhos, quadros, varões de cortina e organizadores de parede, fixados em montante ou alvenaria.",
      "Montaje de repisas, espejos, cuadros, barras de cortina y organizadores de pared fijados en montantes o mampostería."),
    florida: g("Many Florida homes have concrete-block exterior walls that need masonry anchors, not drywall anchors.",
      "Muitas casas na Flórida têm paredes externas de bloco de concreto, que exigem buchas para alvenaria, não para drywall.",
      "Muchas casas en Florida tienen paredes exteriores de bloque de concreto que requieren anclajes para mampostería, no para drywall."),
    prep: g("Share what you are mounting, its weight and the wall type if you know it.",
      "Informe o que será instalado, o peso e o tipo de parede, se souber.",
      "Indica qué vas a montar, su peso y el tipo de pared si lo sabes.")
  },
  "tv-mounting": {
    price: { min: 100, max: 250, unit: "item" },
    intro: g("TV wall mounting with bracket installation, level alignment and optional cable concealment.",
      "Instalação de TV na parede com suporte, nivelamento e, se quiser, ocultação de cabos.",
      "Montaje de TV en la pared con soporte, nivelación y ocultación de cables opcional."),
    florida: g("Lanai and outdoor TVs need weather-rated mounts and GFCI outlets; say if the TV goes outside.",
      "TVs em lanai ou área externa precisam de suporte para intempérie e tomada com proteção GFCI; diga se a TV vai para fora.",
      "Los TV de lanai o exterior necesitan soportes para intemperie y tomas con protección GFCI; indica si el TV va afuera."),
    prep: g("Share TV size, wall type, whether you have the bracket and if cables should be hidden.",
      "Informe o tamanho da TV, o tipo de parede, se já tem o suporte e se os cabos devem ser escondidos.",
      "Indica el tamaño del TV, tipo de pared, si tienes el soporte y si se deben ocultar los cables.")
  },
  "moving-help": {
    price: { min: 90, max: 160, unit: "hour" },
    intro: g("Loading, unloading and moving furniture within a home or into a rental truck, usually with two helpers.",
      "Carregar, descarregar e mover móveis dentro de casa ou para um caminhão alugado, geralmente com dois ajudantes.",
      "Cargar, descargar y mover muebles dentro de la casa o hacia un camión alquilado, normalmente con dos ayudantes."),
    florida: g("Summer heat slows moves down; early-morning starts are faster and safer for everyone.",
      "O calor do verão deixa a mudança mais lenta; começar cedo é mais rápido e seguro para todos.",
      "El calor del verano hace más lenta la mudanza; empezar temprano es más rápido y seguro para todos."),
    prep: g("Share both addresses, stairs or elevators, large items and whether a truck is already rented.",
      "Informe os dois endereços, escadas ou elevadores, itens grandes e se o caminhão já está alugado.",
      "Indica ambas direcciones, escaleras o ascensores, artículos grandes y si ya alquilaste el camión.")
  },
  packing: {
    price: { min: 60, max: 120, unit: "hour" },
    intro: g("Packing and unpacking rooms, kitchens and fragile items, with labeling for the move.",
      "Empacotar e desempacotar cômodos, cozinha e itens frágeis, com etiquetas para a mudança.",
      "Empacar y desempacar habitaciones, cocinas y artículos frágiles, con etiquetas para la mudanza."),
    florida: g("Humidity can damage items stored in garages or boxes for long periods; ask for sealed bins for electronics and documents.",
      "A umidade pode estragar itens guardados em garagem ou caixas por muito tempo; peça caixas vedadas para eletrônicos e documentos.",
      "La humedad puede dañar artículos guardados en garajes o cajas por mucho tiempo; pide contenedores sellados para electrónicos y documentos."),
    prep: g("Share the number of rooms, whether you have boxes and any fragile or valuable items.",
      "Informe o número de cômodos, se já tem caixas e itens frágeis ou valiosos.",
      "Indica el número de habitaciones, si tienes cajas y artículos frágiles o valiosos.")
  },
  "furniture-removal": {
    price: { min: 100, max: 300, unit: "job" },
    intro: g("Removal and haul-away of old furniture, mattresses and bulky items.",
      "Retirada e descarte de móveis velhos, colchões e itens volumosos.",
      "Retiro y desecho de muebles viejos, colchones y artículos voluminosos."),
    florida: g("Some Central Florida counties offer bulk-item curbside pickup; ask the Pro whether items go to donation, recycling or the landfill.",
      "Alguns condados da Flórida Central recolhem itens volumosos na calçada; pergunte ao Pro se os itens vão para doação, reciclagem ou aterro.",
      "Algunos condados de Florida Central recogen artículos voluminosos en la acera; pregunta al Pro si van a donación, reciclaje o vertedero."),
    prep: g("List the items, where they are in the home and whether stairs are involved.",
      "Liste os itens, onde estão na casa e se há escadas.",
      "Enumera los artículos, dónde están en la casa y si hay escaleras.")
  },
  "home-organization": {
    price: { min: 55, max: 100, unit: "hour" },
    intro: g("Decluttering and organizing closets, pantries, garages and kids' rooms with practical systems.",
      "Destralhe e organização de closets, despensas, garagens e quartos infantis com sistemas práticos.",
      "Organización de clósets, despensas, garajes y cuartos de niños con sistemas prácticos."),
    florida: g("Florida garages get very hot and humid; keep paper, photos and electronics indoors when reorganizing.",
      "Garagens na Flórida ficam muito quentes e úmidas; mantenha papéis, fotos e eletrônicos dentro de casa ao reorganizar.",
      "Los garajes en Florida son muy calurosos y húmedos; mantén papeles, fotos y electrónicos dentro de la casa al reorganizar."),
    prep: g("Share which spaces, their size and whether you want storage products purchased.",
      "Informe quais espaços, o tamanho e se quer que o Pro compre organizadores.",
      "Indica qué espacios, su tamaño y si quieres que se compren organizadores.")
  },
  "laundry-ironing": {
    price: { min: 30, max: 60, unit: "hour" },
    intro: g("Washing, drying, folding and ironing at your home.",
      "Lavar, secar, dobrar e passar roupas na sua casa.",
      "Lavar, secar, doblar y planchar ropa en tu casa."),
    florida: g("In humid weather, clothes left damp mildew quickly, so ask for full drying before folding.",
      "No clima úmido, roupa que fica molhada cria mofo rápido, então peça secagem completa antes de dobrar.",
      "Con la humedad, la ropa húmeda se enmohece rápido, así que pide secado completo antes de doblar."),
    prep: g("Share the number of loads and any items that need special care.",
      "Informe o número de cargas e peças que precisam de cuidado especial.",
      "Indica el número de cargas y las prendas que requieren cuidado especial.")
  },
  painting: {
    price: { min: 300, max: 800, unit: "room" },
    intro: g("Interior and exterior painting, including prep, patching, trim and cleanup.",
      "Pintura interna e externa, incluindo preparação, remendos, acabamentos e limpeza.",
      "Pintura interior y exterior, incluida la preparación, parches, molduras y limpieza."),
    florida: g("Exterior paint in Florida should be rated for UV and mildew, and many HOAs require approved colors before work starts.",
      "Tinta externa na Flórida deve resistir a UV e mofo, e muitos HOAs exigem cores aprovadas antes de começar.",
      "La pintura exterior en Florida debe resistir UV y moho, y muchos HOA exigen colores aprobados antes de empezar."),
    prep: g("Share rooms or walls, ceiling height, colors and whether paint is supplied.",
      "Informe cômodos ou paredes, altura do teto, cores e se a tinta já está comprada.",
      "Indica habitaciones o paredes, altura del techo, colores y si ya tienes la pintura.")
  },
  "window-cleaning": {
    price: { min: 150, max: 350, unit: "home" },
    intro: g("Interior and exterior window cleaning, tracks, screens and sliding doors.",
      "Limpeza de janelas por dentro e por fora, trilhos, telas e portas de correr.",
      "Limpieza de ventanas por dentro y por fuera, rieles, mallas y puertas corredizas."),
    florida: g("Pollen, lovebug season (usually May and September) and sprinkler spots make exterior glass dirty faster here.",
      "Pólen, a temporada de lovebugs (geralmente maio e setembro) e respingos de sprinkler sujam os vidros externos mais rápido aqui.",
      "El polen, la temporada de lovebugs (normalmente mayo y septiembre) y las manchas de aspersores ensucian los vidrios exteriores más rápido aquí."),
    prep: g("Share the number of windows, stories and whether screens should be cleaned.",
      "Informe o número de janelas, andares e se as telas devem ser limpas.",
      "Indica el número de ventanas, pisos y si se deben limpiar las mallas.")
  },
  "smart-home-installation": {
    price: { min: 90, max: 250, unit: "job" },
    intro: g("Installing smart locks, doorbells, cameras, thermostats and Wi-Fi devices, with app setup.",
      "Instalação de fechaduras inteligentes, campainhas, câmeras, termostatos e dispositivos Wi-Fi, com configuração do app.",
      "Instalación de cerraduras inteligentes, timbres, cámaras, termostatos y dispositivos Wi-Fi, con configuración de la app."),
    florida: g("Smart locks and keypad access are popular for vacation rentals; ask for guest codes to be set up and tested.",
      "Fechaduras inteligentes e acesso por senha são populares em casas de temporada; peça para configurar e testar os códigos de hóspedes.",
      "Las cerraduras inteligentes con código son populares en alquileres vacacionales; pide que se configuren y prueben los códigos de huéspedes."),
    prep: g("List the devices, brands and whether wiring already exists.",
      "Liste os dispositivos, as marcas e se a fiação já existe.",
      "Enumera los dispositivos, las marcas y si el cableado ya existe.")
  },
  "pest-control": {
    price: { min: 100, max: 250, unit: "visit" },
    intro: g("Treatment for ants, roaches, spiders, rodents and other common household pests, with follow-up plans.",
      "Tratamento contra formigas, baratas, aranhas, roedores e outras pragas domésticas, com planos de acompanhamento.",
      "Tratamiento contra hormigas, cucarachas, arañas, roedores y otras plagas del hogar, con planes de seguimiento."),
    florida: g("Pest control in Florida is licensed by the Florida Department of Agriculture (FDACS). Termites and palmetto bugs are common, so ask about termite inspections too.",
      "O controle de pragas na Flórida é licenciado pelo Departamento de Agricultura (FDACS). Cupins e baratas palmetto são comuns, então pergunte também sobre inspeção de cupim.",
      "El control de plagas en Florida está licenciado por el Departamento de Agricultura (FDACS). Las termitas y las cucarachas palmetto son comunes, así que pregunta también por inspección de termitas."),
    prep: g("Describe the pest, where you see it, pets or children at home and past treatments.",
      "Descreva a praga, onde aparece, se há animais ou crianças em casa e tratamentos anteriores.",
      "Describe la plaga, dónde aparece, si hay mascotas o niños y tratamientos anteriores.")
  },
  "lawn-care": {
    price: { min: 40, max: 80, unit: "visit" },
    intro: g("Mowing, edging, trimming and blowing, as a one-time cut or recurring service.",
      "Corte, acabamento de bordas, poda e sopragem, avulso ou recorrente.",
      "Corte, bordes, poda y soplado, como servicio único o recurrente."),
    florida: g("St. Augustine and Bahia grass grow fastest from March to October, when weekly cuts are typical. Watering days are set by local water-management rules.",
      "A grama St. Augustine e Bahia cresce mais de março a outubro, quando o corte semanal é o normal. Os dias de rega seguem as regras locais de uso de água.",
      "El césped St. Augustine y Bahia crece más de marzo a octubre, cuando el corte semanal es lo normal. Los días de riego los fijan las normas locales de agua."),
    prep: g("Share the approximate yard size, gates, pets and how often you want service.",
      "Informe o tamanho aproximado do quintal, portões, animais e a frequência desejada.",
      "Indica el tamaño aproximado del jardín, portones, mascotas y la frecuencia deseada.")
  },
  "appliance-repair": {
    price: { min: 150, max: 350, unit: "job" },
    intro: g("Diagnosis and repair of washers, dryers, refrigerators, dishwashers, ovens and ice makers.",
      "Diagnóstico e reparo de lavadoras, secadoras, geladeiras, lava-louças, fornos e máquinas de gelo.",
      "Diagnóstico y reparación de lavadoras, secadoras, refrigeradores, lavavajillas, hornos y máquinas de hielo."),
    florida: g("Hard water shortens the life of dishwashers, ice makers and washer valves; mention water-quality issues if you see scale.",
      "A água dura reduz a vida útil de lava-louças, máquinas de gelo e válvulas de lavadora; mencione se notar calcário.",
      "El agua dura acorta la vida de lavavajillas, máquinas de hielo y válvulas de lavadora; menciónalo si ves sarro."),
    prep: g("Share the brand, model number, age and any error codes.",
      "Informe marca, número do modelo, idade e códigos de erro.",
      "Indica la marca, el número de modelo, la antigüedad y los códigos de error.")
  },
  "pressure-washing": {
    price: { min: 150, max: 400, unit: "job" },
    intro: g("Pressure or soft washing of driveways, walkways, patios, pool decks, fences and home exteriors.",
      "Lavagem de alta pressão ou lavagem suave de garagens, calçadas, pátios, decks de piscina, cercas e fachadas.",
      "Lavado a presión o lavado suave de entradas, aceras, patios, decks de piscina, cercas y fachadas."),
    florida: g("Mildew and algae grow fast in Florida humidity. Roofs and painted stucco should be soft-washed, not blasted at high pressure.",
      "Mofo e algas crescem rápido na umidade da Flórida. Telhados e reboco pintado devem receber lavagem suave, não jato de alta pressão.",
      "El moho y las algas crecen rápido con la humedad de Florida. Los techos y el estuco pintado deben lavarse suave, no a alta presión."),
    prep: g("List the surfaces, approximate square footage and whether you have water access outside.",
      "Liste as superfícies, a metragem aproximada e se há ponto de água do lado de fora.",
      "Enumera las superficies, los pies cuadrados aproximados y si hay acceso a agua afuera.")
  }
};

export const FALLBACK_SERVICE_GUIDE: ServiceGuide = {
  price: { min: 60, max: 150, unit: "job" },
  intro: g("Describe the task in your own words and local Pros respond with a quote before anything is booked.",
    "Descreva a tarefa com suas palavras e Pros locais respondem com um orçamento antes de qualquer reserva.",
    "Describe la tarea con tus palabras y los Pros locales responden con una cotización antes de reservar."),
  florida: FLORIDA_WIDE[1],
  prep: g("Include the address area, timing and anything the Pro should know before arriving.",
    "Inclua a região do endereço, o horário e o que o Pro deve saber antes de chegar.",
    "Incluye la zona de la dirección, el horario y lo que el Pro debe saber antes de llegar.")
};

export function cityGuide(slug: string) {
  return CITY_GUIDES[slug] ?? null;
}

export function serviceGuide(slug: string) {
  return SERVICE_GUIDES[slug] ?? FALLBACK_SERVICE_GUIDE;
}

export function floridaWideTips() {
  return FLORIDA_WIDE;
}

const UNIT_LABEL: Record<PriceUnit, Localized> = {
  job: g("per job", "por serviço", "por trabajo"),
  hour: g("per hour", "por hora", "por hora"),
  visit: g("per visit", "por visita", "por visita"),
  month: g("per month", "por mês", "por mes"),
  item: g("per item", "por item", "por artículo"),
  room: g("per room", "por cômodo", "por habitación"),
  home: g("per home", "por casa", "por casa"),
  turnover: g("per turnover", "por troca de hóspedes", "por cambio de huéspedes")
};

export function priceUnitLabel(unit: PriceUnit, locale: PublicLocale) {
  return UNIT_LABEL[unit][locale];
}

/** Meta description: price range + real neighborhoods + the free request, so the snippet answers the searcher. */
export function localServiceMetaDescription(locale: PublicLocale, categorySlug: string, citySlug: string, service: string, place: string) {
  const guide = serviceGuide(categorySlug);
  const city = cityGuide(citySlug);
  const range = `$${guide.price.min}–$${guide.price.max} ${priceUnitLabel(guide.price.unit, locale)}`;
  const areas = city ? city.areas.slice(0, 3).join(", ") : place;
  if (locale === "pt-br") return `${service} em ${place}: preço típico ${range}, atendendo ${areas} e região. Dicas locais e pedido de orçamento grátis a Pros locais na VeroTask.`;
  if (locale === "es") return `${service} en ${place}: precio típico ${range}, atendiendo ${areas} y alrededores. Consejos locales y solicitud de cotización gratis a Pros locales en VeroTask.`;
  return `${service} in ${place}: typical cost ${range}, serving ${areas} and nearby. Local tips and a free quote request to local Pros on VeroTask.`;
}
