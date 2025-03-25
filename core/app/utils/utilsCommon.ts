import merge from "deepmerge"

export function deepClone(obj: any) {
    return JSON.parse(JSON.stringify(obj))
}

export function deepMerge(obj1: any, obj2: any) {
    return merge(obj1, obj2)
}