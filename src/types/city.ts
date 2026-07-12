/** A city record as stored in src/data/cities.json */
export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  /** IANA timezone identifier, e.g. "America/Sao_Paulo" */
  timezone: string;
  population: number;
  aliases?: string[];
}

/** A city added to the comparator, with its display order. */
export interface ComparedCity {
  city: City;
  /** Position in the comparator (0 = topmost row). Lower sorts first. */
  order: number;
}
