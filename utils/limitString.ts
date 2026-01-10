export default function limitString(str: string, max = 32) {
  return [...str].length > max ? [...str].slice(0, max).join('') : str
}
