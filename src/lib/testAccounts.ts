export const COMPANY_TEST_EMAIL = 'empresa.teste.nexus@gmail.com';

export const isCompanyTestEmail = (email: string | null | undefined) =>
  email?.toLowerCase() === COMPANY_TEST_EMAIL;
