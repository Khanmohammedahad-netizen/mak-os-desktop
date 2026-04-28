/**
 * Phone number normalization utility for CRM channel dispatch.
 *
 * Produces E.164 format (`+<countryCode><localNumber>`) from raw user input,
 * using city/country hints when the number lacks an explicit country code.
 *
 * @module normalize-phone
 */

/** Maps lowercase city or country name to its ITU calling code (no leading `+`). */
const COUNTRY_CODE_MAP: Readonly<Record<string, string>> = {
  // UAE
  dubai: '971',
  'abu dhabi': '971',
  sharjah: '971',
  ajman: '971',
  'ras al khaimah': '971',
  fujairah: '971',
  uae: '971',
  'united arab emirates': '971',
  // Saudi Arabia
  riyadh: '966',
  jeddah: '966',
  dammam: '966',
  'saudi arabia': '966',
  ksa: '966',
  // Qatar
  doha: '974',
  qatar: '974',
  // Kuwait
  'kuwait city': '965',
  kuwait: '965',
  // Oman
  muscat: '968',
  oman: '968',
  // Bahrain
  manama: '973',
  bahrain: '973',
  // India
  mumbai: '91',
  delhi: '91',
  bangalore: '91',
  hyderabad: '91',
  india: '91',
  // Japan
  tokyo: '81',
  osaka: '81',
  japan: '81',
  // UK
  london: '44',
  manchester: '44',
  uk: '44',
  'united kingdom': '44',
  // France
  paris: '33',
  france: '33',
  // Germany
  berlin: '49',
  germany: '49',
  // Australia
  sydney: '61',
  melbourne: '61',
  australia: '61',
  // USA / Canada (NANP)
  'new york': '1',
  'los angeles': '1',
  usa: '1',
  toronto: '1',
  canada: '1',
} as const;

/**
 * Expected number of subscriber digits (excluding the country code) for each
 * calling code.  Defaults to 8 when the calling code is absent from this map.
 */
const LOCAL_DIGITS: Readonly<Record<string, number>> = {
  '971': 9,  // UAE  (e.g. 50 123 4567)
  '966': 9,  // Saudi Arabia
  '974': 8,  // Qatar
  '965': 8,  // Kuwait
  '968': 8,  // Oman
  '973': 8,  // Bahrain
  '91': 10,  // India
  '81': 10,  // Japan
  '44': 10,  // UK
  '33': 9,   // France
  '49': 10,  // Germany
  '61': 9,   // Australia
  '1': 10,   // USA / Canada (NANP)
} as const;

/**
 * Normalizes a phone number to E.164 format (`+<digits>`).
 *
 * ### Resolution order
 * 1. If `phone` already starts with `+`, strip non-digits and validate length
 *    (10–15 total digits).  Returns early — `city` / `country` are ignored.
 * 2. Otherwise derive the calling code from `city` then `country` (case-
 *    insensitive).  Returns `null` when no calling code can be inferred.
 * 3. Strip all non-digit characters from `phone`.
 * 4. If the digit string already starts with the calling code, remove it.
 * 5. Strip a single leading `0` (trunk prefix used in many countries).
 * 6. Take the last `LOCAL_DIGITS[code]` digits as the subscriber number.
 * 7. Validate total length (10–15 digits inclusive) and return `+code+local`.
 *
 * @param phone   Raw phone string — any separator characters are accepted.
 * @param city    City hint used to infer calling code (case-insensitive).
 * @param country Country hint used as fallback (case-insensitive).
 * @returns E.164 string on success, or `null` when normalization is not
 *          possible (unknown region, invalid length, empty input).
 */
export function normalizePhone(
  phone: string,
  city: string,
  country: string,
): string | null {
  if (!phone || !phone.trim()) return null;

  // --- Fast path: already an international number with leading `+` -----------
  if (phone.startsWith('+')) {
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
    return null;
  }

  // --- Resolve calling code from hints ----------------------------------------
  const lookupCity = city?.toLowerCase().trim() ?? '';
  const lookupCountry = country?.toLowerCase().trim() ?? '';
  const callingCode =
    COUNTRY_CODE_MAP[lookupCity] ?? COUNTRY_CODE_MAP[lookupCountry] ?? null;

  if (callingCode === null) return null;

  // --- Digit extraction -------------------------------------------------------
  let digits = phone.replace(/\D/g, '');

  // Remove a leading copy of the calling code if the number was entered with it
  // but without the `+` (e.g. "971501234567" for UAE).
  if (digits.startsWith(callingCode)) {
    digits = digits.slice(callingCode.length);
  }

  // Strip a single leading trunk zero (common in UAE, UK, Saudi, etc.).
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Take only the rightmost N subscriber digits to handle any remaining prefix
  // noise while preserving the subscriber portion.
  const expectedLocal = LOCAL_DIGITS[callingCode] ?? 8;
  const localNumber = digits.slice(-expectedLocal);

  const normalized = `+${callingCode}${localNumber}`;
  const totalDigits = normalized.replace(/\D/g, '').length;

  if (totalDigits < 10 || totalDigits > 15) return null;

  return normalized;
}
