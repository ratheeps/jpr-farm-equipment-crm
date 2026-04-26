export function isLoginDisabled(user: {
  phone: string;
  passwordHash: string;
}): boolean {
  return user.phone === "system@internal" || user.passwordHash === "!disabled";
}
