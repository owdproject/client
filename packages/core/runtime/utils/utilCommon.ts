export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function deepEqual(obj1: any, obj2: any) {
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  if (keys1.length !== keys2.length) {
    return false
  }
  for (const key of keys1) {
    if (!obj2.hasOwnProperty(key)) {
      return false
    }
    if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      if (!deepEqual(obj1[key], obj2[key])) {
        return false
      }
    } else {
      if (obj1[key] !== obj2[key]) {
        return false
      }
    }
  }
  return true
}
