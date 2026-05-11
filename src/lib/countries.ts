export interface CountryInfo {
  code: string;
  name: string;
  ddi: string;
  phonePlaceholder: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "BR", name: "Brasil",           ddi: "+55",  phonePlaceholder: "11 99999-9999" },
  { code: "AR", name: "Argentina",        ddi: "+54",  phonePlaceholder: "9 11 1234-5678" },
  { code: "CL", name: "Chile",            ddi: "+56",  phonePlaceholder: "9 1234 5678" },
  { code: "CO", name: "Colômbia",         ddi: "+57",  phonePlaceholder: "312 345 6789" },
  { code: "MX", name: "México",           ddi: "+52",  phonePlaceholder: "55 1234 5678" },
  { code: "PE", name: "Peru",             ddi: "+51",  phonePlaceholder: "912 345 678" },
  { code: "UY", name: "Uruguai",          ddi: "+598", phonePlaceholder: "99 123 456" },
  { code: "PY", name: "Paraguai",         ddi: "+595", phonePlaceholder: "981 123 456" },
  { code: "BO", name: "Bolívia",          ddi: "+591", phonePlaceholder: "71234567" },
  { code: "EC", name: "Equador",          ddi: "+593", phonePlaceholder: "99 123 4567" },
  { code: "VE", name: "Venezuela",        ddi: "+58",  phonePlaceholder: "412 123 4567" },
  { code: "US", name: "Estados Unidos",   ddi: "+1",   phonePlaceholder: "(555) 123-4567" },
  { code: "PT", name: "Portugal",         ddi: "+351", phonePlaceholder: "912 345 678" },
  { code: "ES", name: "Espanha",          ddi: "+34",  phonePlaceholder: "612 34 56 78" },
  { code: "GB", name: "Reino Unido",      ddi: "+44",  phonePlaceholder: "7911 123456" },
  { code: "DE", name: "Alemanha",         ddi: "+49",  phonePlaceholder: "151 12345678" },
  { code: "FR", name: "França",           ddi: "+33",  phonePlaceholder: "6 12 34 56 78" },
  { code: "IT", name: "Itália",           ddi: "+39",  phonePlaceholder: "312 345 6789" },
  { code: "CA", name: "Canadá",           ddi: "+1",   phonePlaceholder: "(555) 123-4567" },
  { code: "AU", name: "Austrália",        ddi: "+61",  phonePlaceholder: "412 345 678" },
  { code: "JP", name: "Japão",            ddi: "+81",  phonePlaceholder: "90-1234-5678" },
  { code: "CN", name: "China",            ddi: "+86",  phonePlaceholder: "131 2345 6789" },
  { code: "IN", name: "Índia",            ddi: "+91",  phonePlaceholder: "98765 43210" },
  { code: "ZA", name: "África do Sul",    ddi: "+27",  phonePlaceholder: "71 234 5678" },
  { code: "NG", name: "Nigéria",          ddi: "+234", phonePlaceholder: "803 123 4567" },
  { code: "AO", name: "Angola",           ddi: "+244", phonePlaceholder: "923 123 456" },
  { code: "MZ", name: "Moçambique",       ddi: "+258", phonePlaceholder: "82 123 4567" },
  { code: "OTHER", name: "Outro",         ddi: "+",    phonePlaceholder: "" },
];

export function getCountry(code: string): CountryInfo {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[COUNTRIES.length - 1];
}
