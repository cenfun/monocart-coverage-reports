export interface Options {
    enabled: boolean;
}

export function neverCalled(options: Options): number {
    if (options.enabled) {
        return 1;
    } else {
        return 0;
    }
}
