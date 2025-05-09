export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}

export function deepEqual(obj1, obj2) {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) {
        return false;
    }
    for (const key of keys1) {
        if (!obj2.hasOwnProperty(key)) {
            return false;
        }
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
            if (!deepEqual(obj1[key], obj2[key])) {
                return false;
            }
        } else {
            if (obj1[key] !== obj2[key]) {
                return false;
            }
        }
    }
    return true;
}

export function deepMerge<T>(target: T, source: Partial<T>): T {
    function isObject(value: any): value is Record<string, any> {
        return (
            value !== null &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Date) &&
            !(value instanceof RegExp)
        )
    }

    if (isObject(target) && isObject(source)) {
        const result = { ...target }

        for (const key in source) {
            const targetValue = (target as any)[key]
            const sourceValue = (source as any)[key]

            if (isObject(sourceValue) && isObject(targetValue)) {
                // @ts-ignore
                result[key] = deepMerge(targetValue, sourceValue)
            } else {
                result[key] = sourceValue
            }
        }

        return result
    }

    return source as T
}