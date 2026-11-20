import type { User } from './types.ts';

export interface Result {
    label: string;
}

export type Direction = 'positive' | 'other';

export function describe(value: number): string {
    if (value > 0) {
        return 'positive';
    } else {
        return 'other';
    }
}

export function unused(value: number): number {
    return value * 2;
}

export function identity<T>(value: T): T {
    return value;
}

export function greet(user: User): Result {
    return { label: user.name! } satisfies Result;
}
