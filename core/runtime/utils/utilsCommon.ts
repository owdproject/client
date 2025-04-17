export function deepClone(obj: any) {
    return JSON.parse(JSON.stringify(obj))
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