import {getAllProps} from "../util";
import {isObservable, isObservableWithExpectTo, pushJoinFrom, pushJoinTo} from "./observable";

export default function from(fromOne, fromProps?: string[]) {
  if (!isObservable(fromOne)) {
    throw new Error(`The join to object must be an observable object.`)
  }
  if (isObservableWithExpectTo(fromOne)) {
    throw new Error(`The observable object has expectTo,join is not allowed.`)
  }


  return {
    joinTo(toOne, toProps?: string[]) {
      if (typeof toOne === 'object') {
        if (!isObservable(toOne)) {
          throw new Error(`The join from object must be an observable object.`)
        }
        if (fromProps?.length !== toProps?.length) {
          throw new Error(`The mapping props(in from and to) must be a same length.`)
        }

        let mapping: Array<Array<string>> = []
        if (fromProps?.length > 0) {
          fromProps?.forEach((fp, idx) => {
            mapping.push([fp, (toProps as Array)[idx]])
          })
        } else {
          const props = getAllProps(fromOne)
          props.forEach(prop => {
            mapping.push([prop, prop])
          })
        }

        pushJoinTo(fromOne, toOne, mapping)
        pushJoinFrom(toOne, fromOne, mapping)
      }
    }
  }
}