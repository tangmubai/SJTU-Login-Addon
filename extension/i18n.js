export function message(name, substitutions) {
  return globalThis.chrome?.i18n?.getMessage(name, substitutions) || name;
}
