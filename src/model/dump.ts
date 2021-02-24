import {stored, HASHCODE, KEY_REF} from "./state-common";
import {genFnName, getAllProps, getPropertyDescriptor} from "../util";
import {META_IGNORE, META_IGNORE_ME} from "../constants";
import {searchForMeta} from "./decorators";

export const FLAG_OBSERVABLE = '_observable_'

export const FROMCLASS = '_from_';

// export const TEMP_MERGEDATA = '_merge_data_'

/**
 * Dump all states
 */
export function dump(...sidAry: string[]) {
  const result = {}

  const tracer = (target, prop, value) => value

  //console.log(stored)

  Object.keys(stored).forEach(sid => {
    if (sidAry.length == 0 || sidAry.find(id => id === sid)) {
      const srtn = dumpObj(stored[sid], tracer, true)
      result[sid] = srtn
    }
  })
  return result;
}

function dumpObj(target, tracer, noFunction?): { consts, refs, def } {
  let refs = {}, didMap = {}, consts = {froms: []};

  function _deepCopy(target) {
    if ((typeof target !== 'object') || !target) {
      return target;
    }
    if (isIgnored(target)) {
      return
    }
    if (target[HASHCODE]) {
      if (refs[target[HASHCODE]]) {
        return {[KEY_REF]: target[HASHCODE]}
      }
      if (didMap[target[HASHCODE]]) {
        return {[KEY_REF]: target[HASHCODE]};
      }
    }

    let obj: any = {};
    if (Array.isArray(target)) {
      obj = [];
    }
    if (target[HASHCODE]) {
      didMap[target[HASHCODE]] = true;
    }

    if (Array.isArray(target)) {
      const ignoreIdx = []
      Object.keys(target).forEach(key => {
        try {
          if (key.match(/^__.+__$/g) || obj[key]) {//Remove all private vars
            return;
          }
        } catch (e) {
          //debugger;
        }

        const ntarget = target[key]
        if (isIgnored(ntarget)) {
          ignoreIdx.push(key)
          obj[key] = void 0
        } else {
          obj[key] = _deepCopy(tracer(target, key, ntarget))
        }
      })
      if (ignoreIdx.length > 0) {
        ignoreIdx.forEach(idx => obj.splice(idx, 1))
      }
    } else {
      let props = getAllProps(target)
      if (props.length > 0) {
        const mmetas = target[META_IGNORE]
        props.forEach(prop => {
          if (prop === META_IGNORE) {
            return
          }
          const descr = getPropertyDescriptor(target, prop);
          if (descr && (descr.get && !descr.set)) {//Ignore getter in target
            return
          }
          if (!mmetas || !mmetas[prop]) {//State ignore
            if (!noFunction || noFunction && typeof (target[prop]) != 'function') {
              obj[prop] = _deepCopy(tracer(target, prop, target[prop]))
            }
          }
        })
      }

      if (target[FLAG_OBSERVABLE] === true) {
        obj[FLAG_OBSERVABLE] = true
      }

      const meta = searchForMeta(target)
      let slmeta;
      if (meta && (slmeta = meta['serialized'])) {
        consts.froms.find(nm => nm === slmeta['name'])

        let idx = consts.froms.indexOf(slmeta['name'])
        if (idx === -1) {
          consts.froms.push(slmeta['name'])
          idx = consts.froms.length - 1
        }

        obj[FROMCLASS] = idx
      } else if (target[HASHCODE]) {
        throw new Error(`Invalid data format.`)
      }
    }
    if (obj[HASHCODE]) {
      const hc = obj[HASHCODE]
      refs[hc] = obj;

      delete obj[HASHCODE]///TODO

      return {[KEY_REF]: hc};
    }
    return obj;
  }

  const rtn = {consts, refs, def: _deepCopy(target)}

  didMap = void 0
  return rtn
}

function isIgnored(target) {
  return target && typeof target === 'object' && target[META_IGNORE_ME]
}
