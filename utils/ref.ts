export const parseRefPayload = (payload?: string) => {
  if (!payload) return null

  // ref_<uuid>
  if (payload.startsWith('ref_')) {
    return { type: 'reflink', value: payload.slice(4) }
  }

  // userId
  if (/^\d+$/.test(payload)) {
    return { type: 'user', value: Number(payload) }
  }

  return null
}
