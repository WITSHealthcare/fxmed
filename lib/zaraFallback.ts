// What Zara shows when it cannot answer. Client-safe: used by the API route and the chat widget.
// Every fallback carries emergency advice, because a person in an emergency may be the one
// whose message failed.
const EMERGENCY = 'If this is a medical emergency, call 112 or the Lagos emergency line 767, or go to the nearest hospital emergency department.'

export const ZARA_UNAVAILABLE_MESSAGE = `I'm having trouble connecting right now. ${EMERGENCY} Otherwise, please try again or contact us at fxmed@wellnesswits.com.`
export const ZARA_RATE_LIMITED_MESSAGE = `Too many messages. Please wait a moment and try again. ${EMERGENCY}`
