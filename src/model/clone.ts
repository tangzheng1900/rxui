import {META_IGNORE} from "../constants";
import {getAllProps, getPropertyDescriptor} from "../util";
import {getOriginal} from "../rx/observable";
import {HASHCODE} from "./state-common";

export function clone(target, forAll?) {
  let copyed_objs = [];

  function _deepCopy(target) {
    target = getOriginal(target)
    if ((typeof target !== 'object') || !target) {
      return target;
    }
    for (let i = 0; i < copyed_objs.length; i++) {
      if (copyed_objs[i].target === target) {
        return copyed_objs[i].copyTarget;
      }
    }
    let obj = {};
    if (Array.isArray(target)) {
      obj = [];
    }
    copyed_objs.push({target: target, copyTarget: obj});

    if (Array.isArray(target)) {
      Object.keys(target).forEach(key => {
        if (/^__.+__$/g.test(key) || obj[key]) {
          return;
        }
        obj[key] = _deepCopy(target[key]);
      });
    } else {
      if(target instanceof RegExp){//Reg
        debugger
      }else{
        let props = getAllProps(target);
        if (props.length > 0) {
          let mmetas = target[META_IGNORE]
          props.forEach(prop => {
            if (prop===HASHCODE) {
              return;
            }
            if (forAll || !mmetas || !mmetas[prop]) {//State ignore
              const descr = getPropertyDescriptor(target, prop);
              if (descr && descr.get) {//getter in target
                Object.defineProperty(obj, prop, {
                  get() {
                    return _deepCopy(target[prop])
                  }
                })
              } else {
                obj[prop] = _deepCopy(target[prop])
              }
            }
          })
        }
      }
    }
    return obj;
  }

  return _deepCopy(target);
}