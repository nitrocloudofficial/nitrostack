export const validateAadhaar = (aadhaar: string): boolean => {
  return /^\d{12}$/.test(aadhaar.replace(/\s+/g, ''));
};

export const validatePAN = (pan: string): boolean => {
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
};

export const validateGSTIN = (gstin: string): boolean => {
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
};

export const validatePhone = (phone: string): boolean => {
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
};
