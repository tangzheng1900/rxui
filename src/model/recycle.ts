import {getAllProps, getPropertyDescriptor} from "../util";
import {HASHCODE, stored} from "./state-common";

export function recycle(model: object): boolean {
  if (!model[HASHCODE]) {
    throw new Error(`Model must has ${HASHCODE} property.`)
  }
  let delIndeed = false, didMap = {};

  let findAndRemove = (to) => {
    if (typeof (to) == 'object' && to !== null) {
      if (to[HASHCODE] == model[HASHCODE]) {
        return true;
      } else {
        if (didMap[to[HASHCODE]]) {
          return;
        }
        didMap[to[HASHCODE]] = true;

        const props = getAllProps(to);
        props.forEach(prop => {
          const descr = getPropertyDescriptor(to, prop);
          if (descr&& descr.get&&!descr.set) {//not setter in target
            return
          }

          let tv = to[prop];
          if (Array.isArray(tv)) {
            tv = tv.map(tto => {
              if (findAndRemove(tto)) {
                delIndeed = true;
                return undefined;
              } else {
                return tto;
              }
            })
            delIndeed && (to[prop] = tv.filter(tto => tto !== undefined))
          } else {
            if (findAndRemove(tv)) {
              delIndeed = true;
              to[prop] = undefined;
            }
          }
        })
      }
    }
  }

  Object.keys(stored).forEach(uid => {
    findAndRemove(stored[uid])
  })
  didMap = void 0
  return delIndeed;
}