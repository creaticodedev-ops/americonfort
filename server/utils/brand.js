/** Official product / agency brand when env is unset */
export const BRAND_NAME = 'Americonfort';

export const defaultAgencyName = () => {
  const fromEnv = process.env.AGENCY_NAME?.trim();
  return fromEnv || BRAND_NAME;
};

export default { BRAND_NAME, defaultAgencyName };
