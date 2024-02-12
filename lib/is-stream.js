export function isStream(stream) {
    return !!stream._readableState || !!stream._writableState
}