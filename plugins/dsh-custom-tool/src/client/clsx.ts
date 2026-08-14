/** Join truthy class name fragments; strings and undefined drop out. */
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(part => typeof part === 'string' && part !== '').join(' ')
}

