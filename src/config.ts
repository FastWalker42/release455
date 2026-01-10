const urlParams = new URLSearchParams(window.location.search)
export const APP_TOKEN = urlParams.get('token')
export const testMode = true
