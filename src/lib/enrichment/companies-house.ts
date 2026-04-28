const BASE_URL = 'https://api.company-information.service.gov.uk';

interface CompaniesHouseAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  postal_code?: string;
  country?: string;
}

export interface UKCompany {
  company_number: string;
  company_name: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  registered_office_address?: CompaniesHouseAddress;
  sic_codes?: string[];
}

export interface CompanyOfficer {
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  address?: CompaniesHouseAddress;
}

interface SearchResponse {
  items?: Array<{
    company_number: string;
    company_name: string;
    company_status: string;
    company_type: string;
    date_of_creation?: string;
    registered_office_address?: CompaniesHouseAddress;
    sic_codes?: string[];
  }>;
}

interface OfficersResponse {
  items?: Array<{
    name: string;
    officer_role: string;
    appointed_on?: string;
    resigned_on?: string;
    nationality?: string;
    occupation?: string;
    address?: CompaniesHouseAddress;
  }>;
}

function authHeader(): Record<string, string> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) throw new Error('COMPANIES_HOUSE_API_KEY not set');
  // Companies House uses HTTP Basic auth with API key as username, empty password
  const encoded = Buffer.from(`${apiKey}:`).toString('base64');
  return { Authorization: `Basic ${encoded}` };
}

export async function searchByName(name: string): Promise<UKCompany[]> {
  const url = new URL(`${BASE_URL}/search/companies`);
  url.searchParams.set('q', name);
  url.searchParams.set('items_per_page', '10');

  const resp = await fetch(url.toString(), {
    headers: { ...authHeader(), Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`Companies House search HTTP ${resp.status}`);

  const data = (await resp.json()) as SearchResponse;
  return (data.items ?? []).map((item) => ({
    company_number: item.company_number,
    company_name: item.company_name,
    company_status: item.company_status,
    company_type: item.company_type,
    date_of_creation: item.date_of_creation,
    registered_office_address: item.registered_office_address,
    sic_codes: item.sic_codes,
  }));
}

export async function getOfficers(companyNumber: string): Promise<CompanyOfficer[]> {
  const url = `${BASE_URL}/company/${encodeURIComponent(companyNumber)}/officers`;
  const resp = await fetch(url, {
    headers: { ...authHeader(), Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!resp.ok) throw new Error(`Companies House officers HTTP ${resp.status}`);

  const data = (await resp.json()) as OfficersResponse;
  return (data.items ?? [])
    .filter((o) => !o.resigned_on) // active officers only
    .map((o) => ({
      name: o.name,
      officer_role: o.officer_role,
      appointed_on: o.appointed_on,
      nationality: o.nationality,
      occupation: o.occupation,
      address: o.address,
    }));
}
