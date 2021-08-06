import observable, {isObservable} from "./observable";

export default function fork(fromObj) {
  if (!isObservable(fromObj)) {
    throw new Error(`The join to object must be an observable object.`)
  }

  const my = observable({})

  return new Proxy(my, {
    has(target, prop) {
      if (prop in fromObj) {
        return true
      } else {
        return prop in my
      }
    },
    get(target, prop: string, receiver) {
      if (prop in fromObj) {
        return fromObj[prop]
      } else {
        return my[prop]
      }
    },
    set(target, prop: string, value, receiver) {
      if (prop in fromObj) {
        return fromObj[prop] = value
      } else {
        return my[prop] = value
      }
    }
  })
}