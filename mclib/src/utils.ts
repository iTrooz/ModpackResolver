export function validateParam(s: string) {
    if (!/^[a-zA-Z0-9]{0,64}$/.test(s)) {
        throw new Error('Invalid parameter: must be 0-64 alphanumeric characters');
    }
}
