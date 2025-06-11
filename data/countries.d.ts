// data/countries.d.ts

export interface CountryDataItem {
  label: string;
  value: string;
}
export interface CityPickerItem {
  label: string;
  value: string;
}
export interface AllCitiesJson {
  [countryName: string]: string[]; 
}
declare module "*/countries.json" {
  const value: CountryDataItem[];
  export default value;
}
declare module "*/all_cities.json" {
  const value: AllCitiesJson; 
  export default value;
}