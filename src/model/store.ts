import {searchForMeta} from "./decorators";
import {loadTodo, stored} from "./state-common";

/**
 * Reg for serialization
 * @param serailId
 * @param implVal
 */
export function store(serailId: string, implVal: object, typeClass: Function) {
  if (typeClass && typeof typeClass === 'function') {
    const meta = searchForMeta(implVal)
    if (!(meta?.serialized?.name)) {
      throw new Error(`No @Serializable({name:string}|string) decorator on ` + typeClass)
    }
  }

  const mergeFn = loadTodo[serailId]
  if (mergeFn !== void 0) {
    mergeFn(implVal)
  }

  stored[serailId] = implVal
}