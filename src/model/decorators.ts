import {HASHCODE} from './state-common';
import {genFnName, uuid} from '../util';
import {META_IGNORE} from "../constants";

type Clz = new (...args: any[]) => object

const MetaKey = '_rxui_meta_'

export const SerializedReg = global['_rxui_serializedReg_'] || (global['_rxui_serializedReg_'] = {})


export function Ignore(fn: Function, prop): any {
  let descr = Object.getOwnPropertyDescriptor(fn, META_IGNORE)
  if (descr) {
    descr.value[prop] = true;
  } else {
    let proto = Object.getPrototypeOf(fn), tvc;
    while (proto && proto !== Object.prototype) {
      tvc = Object.getOwnPropertyDescriptor(proto, META_IGNORE)
      if (tvc) {
        break;
      }
      proto = Object.getPrototypeOf(proto);
    }
    const myvc = Object.assign({}, tvc && tvc.value)
    Object.defineProperty(fn, META_IGNORE, {
      value: myvc,
      writable: true
    })
    myvc[prop] = true;
  }
}

export function Serializable(name: string | {
  name: string,
  load: { (instance: object, prop: string, val: any): any }
}): void | any {
  if (arguments.length == 1) {
    const arg0 = arguments[0];
    if (typeof (arg0) == 'function') {
      return hashcodeFn(arg0, arg0.name)
    } else if (typeof (arg0) == 'string') {
      return function (target: Clz) {
        return hashcodeFn(target, arg0)
      }
    } else if (typeof (arg0) == 'object' && typeof (arg0['name']) == 'string') {
      let {name, load} = arg0
      return function (target: Clz) {
        return hashcodeFn(target, name, load)
      }
    } else {
      throw new Error(`@Serializable's param error.`)
    }
  } else {
    throw new Error('@Serializable should be used to decorate class only.')
  }
}

export function searchForMeta(fn): { serialized: { name: string } } {
  let rtn
  const my = fn.constructor && fn.constructor[MetaKey]
  const proto = Object.getPrototypeOf(fn)
  const ps = proto && searchForMeta(proto)
  if (ps) {
    rtn = Object.assign({}, my || {})
    Object.keys(ps).forEach(nm => {
      rtn[nm] = my && my[nm] ? Object.assign({}, ps[nm], my[nm]) : Object.assign({}, ps[nm])
    })
    return rtn
  } else {
    return my
  }
}

function hashcodeFn<T>(fn: Clz, name, load?) {
  let fnName = genFnName(fn, name)
  const getUid = uuid
  let proxyFn = null, proto
  eval(`
      proxyFn = function ${fnName}(){//Proxied and named
        try{
          const _this = new fn(...arguments)
          
          Object.defineProperty(_this, '${HASHCODE}', {
              value:getUid('${fnName}_'),
              writable: true,
              enumerable:false
          })

          Object.setPrototypeOf(_this,proto)
          return _this
        }catch(ex){//not support ES6?
          throw ex
          
          // var args = []
          //
          // for(var i=0;i<arguments.length;i++){
          //   args.push(arguments[i])
          // }
          // fn.apply(this,args)
          //
          // Object.defineProperty(this, '${HASHCODE}', {
          //     value:getUid('${fnName}_'),
          //     writable: true,
          //     enumerable:false
          // })
        }
      }
      proto = {
        constructor:proxyFn
      }
      var statics = Object.getOwnPropertyNames(fn)
      var regc = /^(length|name|prototype)$/gi
      for(var i=0;i<statics.length;i++){
        var nm = statics[i]
        if(!nm.match(regc)){
          proxyFn[nm] = fn[nm]
        }
      }
      Object.setPrototypeOf(proto,fn.prototype)
      proxyFn.prototype = proto
  `)

  SerializedReg[name] = {proto: proxyFn, load}
  setMeta(proxyFn, 'serialized', 'name', name)

  return proxyFn
}
//
// function setMetaWithType(args, key, val?, typeDescr?) {
//   let fn = function (target: Function, name: string) {
//     let td = typeDescr && typeof (typeDescr) == 'function' ? typeDescr(target, name) : (typeDescr || 'design:type')
//     let dt = Reflect.getMetadata(td, target, name)
//     if (!dt) {
//       dt = Reflect.getMetadata(td, target.constructor, name)
//     }
//     setMeta(target.constructor, key, name, val ? Object.assign({type: dt}, val) : {type: dt})
//     return;
//   }
//   if (args.length == 3
//     && (typeof (args[0]) == 'object' && typeof (args[0]['constructor']) == 'function'//Instance property
//       || typeof (args[0]) == 'function')//Class property
//     && typeof (args[1]) == 'string') {//None parameters
//     fn(...args)
//   } else {
//     return fn
//   }
// }

function setMeta(fn: Function, nm: string, prop, val?) {
  const fary = Object.getOwnPropertyNames(fn).filter(nm => nm == MetaKey)
  const vc = fary.length == 0 ? (fn[MetaKey] = {}) : fn[MetaKey];
  (vc[nm] || (vc[nm] = {}))[prop] = val || fn[prop]
}
