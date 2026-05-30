const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value.trim());

export const resolveInitialEmail = (search: string): string => {
  const candidate = new URLSearchParams(search).get("email")?.trim().toLowerCase() ?? "";
  return isValidEmail(candidate) ? candidate : "";
};
