import {T_ComNode, T_ObservableCfg} from '../../types';
import {Responsive} from './responsive';
import {antiShaking, getPropertyDescriptor, isSymbol, regGlobalObject} from '../util';
import {clone} from '../model'
import {snap} from "./snapshot";
import {META_IGNORE} from "../constants";
import {ObservableNotFoundErr} from "./errors";

const IS_OBSERVABLE_OBJECT = '__observable__'

const PROP_ORIGINAL = '__original__'
const PROP_IS_EXPECTTO = '__isExpectTo__'
const METHOD_PUSH_WATCH = '__pushWatch__'
const METHOD_PUSH_JOIN_FROM = '__pushJoinFrom__'
const METHOD_PUSH_JOIN_TO = '__pushJoinTo__'

//export const RXUI_APPEND = '__rxui__'

type T_Watcher = { on: string, exe: Function, node: T_ComNode, target: {} }

type T_ProxyNode = { source: {}, proxy: {}, parent: T_ProxyNode }

const proxyReg = new WeakMap<{}, {}>()
const watcherReg = new WeakMap<{}, Set<{}>>()
const watchAntiShaking = antiShaking()

export default function observable<T>(source: (new() => T) | T, typeClass: object = source,
                                      config?: T_ObservableCfg<any>, thenEmitToFn?: Function): T {
  if (typeof source === 'function') {
    source = new source()
  }

  let isExpectTo, ignoreAry, cfgWatch

  if (typeof config === 'object') {
    if (!config.to) {
      isExpectTo = config.expectTo
    }
    if (Array.isArray(config.ignore)) {
      ignoreAry = config.ignore
    }

    if (typeof config.watch === 'function') {
      cfgWatch = config.watch
    }
  }

  //const joinFromAry: Array<{ from: {}, mapping: Array<Array<string>> }> = []
  const joinToAry: Array<{ to: {}, mapping: Array<Array<string>> }> = []

  function doWatch(proxyTree: T_ProxyNode, namespace, prop, value, preVal) {
    //console.log(Math.random())
    //setTimeout(v => {
    //console.time('doWatch')
    if (cfgWatch) {
      //const batch = Responsive.applyBatch()
      cfgWatch(namespace, value, preVal)
      //setTimeout(batch.commit)//Invoke in next event cycle,else maybe cause error
    }
    let curNode = proxyTree
    do {
      const {source} = curNode, set = watcherReg.get(source)
      if (set) {
        set.forEach(({on, exe, node, target}) => {
          if (!node.invalid && source === getOriginal(target)) {//Check if had removed
            if (namespace.match(new RegExp(`.${on}$`))) {
              watchAntiShaking.push(exe, prop, value, preVal)
            }
          }
        })
      }
    } while (curNode = curNode.parent)
    //console.timeEnd('doWatch')
    //})
  }

  function proxy(source, parentProxy: T_ProxyNode, parentNS = '') {
    if (isObservable(source)) {//Return observabled cobject directly
      return source
    }

    if (typeof source === 'object' && '_isVue' in source) {
      return source
    }

    const _fnCache = {}
    const ValCache = {
      get(namespace, val, fn: Function) {
        //val = getOriginal(val)
        let rtnVal
        if (typeof (val) === 'function') {
          if (!([namespace] in _fnCache)) {
            _fnCache[namespace] = rtnVal = fn()
          } else {
            rtnVal = _fnCache[namespace]
          }
        } else {
          if (isObservable(val)) {
            return val
          }

          rtnVal = proxyReg.get(val)
          if (rtnVal === void 0) {
            proxyReg.set(val, rtnVal = fn())
          }
          // else{
          //   debugger
          // }

          //rtnVal = appendRXUIVal(val, 'proxy', fn)
        }

        return rtnVal
      }
    }

    const curProxyNode = {source, proxy: void 0, parent: parentProxy}

    const agent = Responsive.applyAgent()

    const result = new Proxy(source, {
      has(target, key) {
        return key === IS_OBSERVABLE_OBJECT
          || key === PROP_ORIGINAL
          || key in target
      },
      get(target, prop: string, receiver) {
        if (target instanceof RegExp) {
          return target[prop]
        }
        if (prop === 'toString'
          || prop === 'toJSON'
          || prop === 'valueOf'
          || prop === '$$typeof'
          || prop === 'constructor'
          || isSymbol(prop)) {
          return target[prop]
        }
        if (prop === PROP_ORIGINAL) {
          return PROP_ORIGINAL in target ? target[PROP_ORIGINAL] : target
        }

        if (prop === PROP_IS_EXPECTTO) {//Reserved var
          return isExpectTo
        }
        if (prop === METHOD_PUSH_WATCH) {
          return (watcher: T_Watcher) => {
            let set = watcherReg.get(source)
            if (!set) {
              watcherReg.set(source, set = new Set())
            }
            if (!set.has(watcher)) {
              set.add(watcher)
            }
          }
        }
        if (prop === METHOD_PUSH_JOIN_FROM) {
          return (from, mapping) => {
            //joinFromAry.push({from, mapping})

            //Merge from
            mapping.forEach(([fprop, tprop]) => {
              const fromAry = fprop.split('.')
              const toAry = tprop.split('.')

              let nowFromVal = from, copiedVal, nowTo = receiver

              fromAry.forEach((name, i) => {
                // if(name.match(/getData/)){
                //   debugger
                // }
                nowFromVal = nowFromVal[name]
                if (i === fromAry.length - 1) {
                  if (typeof nowFromVal === "object" && nowFromVal) {
                    copiedVal = clone(nowFromVal)//deep clone
                  } else {
                    copiedVal = nowFromVal
                  }
                }
              })

              toAry.forEach((name, i) => {
                if (i === toAry.length - 1) {
                  nowTo[name] = copiedVal
                } else {
                  nowTo = nowTo[name]
                  if (!nowTo) {//Break
                    return false
                  }
                }
              })
            })
          }
        }
        if (prop === METHOD_PUSH_JOIN_TO) {
          return (to, mapping) => {
            joinToAry.push({to, mapping})
          }
        }
        //
        // if(prop==='length'||'columns'){
        //   debugger
        // }

        const namespace = parentNS + (prop.match(/^\d+$/) ? `[${prop}]` : ('.' + prop))

        let value
        const descr = getPropertyDescriptor(target, prop);
        if (descr && descr.get) {//getter
          //try {
          value = descr.get.call(receiver)
          // } catch (ex) {
          //   debugger
          // }
        } else {
          value = target[prop]
        }

        if (value === void 0 && isExpectTo && parentNS === '') {//Abstract method,invoke emitTo's implements
          // if(thenEmitToFn){
          //   return (...args) => {
          //     return findImplInPipe(typeClass, prop, thenEmitToFn(), args)
          //   }
          // }

          agent.push(namespace, prop)

          if(thenEmitToFn){
            const fnAry = findImplInPipe(typeClass, prop, thenEmitToFn())

            if(Array.isArray(fnAry)){
              return (...args) => {
                let ary = []
                fnAry.forEach(processer => {
                  ary.push(processer(...args))
                })
                return ary.length == 1 ? ary[0] : ary
              }
            }else{
              return fnAry
            }


            // if(typeof fnAry==='function'){
            //   return fnAry
            // }else if(Array.isArray(fnAry)){
            //   return (...args) => {
            //     let ary = []
            //     fnAry.forEach(processer => {
            //       ary.push(processer(...args))
            //     })
            //     return ary.length == 1 ? ary[0] : ary
            //   }
            // }
            // return (...args) => {
            //   return findImplInPipe(typeClass, prop, thenEmitToFn(), args)
            // }
          }


          // return (...args) => {
          //   if (thenEmitToFn) {
          //     return findImplInPipe(typeClass, prop, thenEmitToFn(), args)
          //   }
          // }
        } else if (typeof value == 'function') {//methods
          let rtn
          if (Array.isArray(target)) {//Array
            // if(prop==='push'){
            //   debugger
            // }
            if (/^(splice)$/gi.test(prop)) {
              rtn = ValCache.get(prop, value, () => (...args) => {
                if (snap) {
                  const aryPropName = parentNS.match(/\.([^\.]+)$/)?.[1]
                  let mmetas = parentProxy.source[META_IGNORE]
                  let notIgnore = !(mmetas && mmetas[aryPropName])
                  //if (notIgnore && (!curXpath && props[prop] || curXpath)) {
                  if (notIgnore) {
                    snap.setUndo(receiver, `before@splice`, target)

                    let rtn
                    snap.sleep(() => {
                      rtn = value.call(receiver, ...args)
                    })

                    return rtn
                  } else {
                    return value.call(receiver, ...args)
                  }
                } else {
                  return value.call(receiver, ...args)
                }
              })
            } else if (/^(indexOf)$/gi.test(prop)) {
              rtn = (...args) => {//Otherwise return -1
                const pargs = args.map(arg => getOriginal(arg))
                const otarget = target.map(item => getOriginal(item))
                return value.call(otarget, ...pargs)
              }
            } else {
              rtn = value
            }
          } else {
            rtn = ValCache.get(prop, value, () => (...args) => {
              try {
                if (target instanceof Date || target instanceof Set || target instanceof Map) {
                  return target[prop].call(target, ...args)
                } else {
                  return target[prop].call(receiver, ...args)
                }
              } catch (ex) {
                throw ex
              }
            })
          }
          return rtn
        } else {
          // if(prop==='options'){
          //   debugger
          // }

          agent.push(namespace, prop)

          if (ignoreAry && ignoreAry.indexOf(prop) !== -1) {
            return value
          }

          // if (Array.isArray(value)) {
          //   const oriVal = getOriginal(value)
          //   const map = appendRXUIVal(oriVal, 'updaters', () => new Map())
          //   let set = map.get(agent)
          //   if (!set) {
          //     map.set(agent, set = new Set())/////TODO
          //   }
          //   if (!set.has(prop)) {
          //     set.add(prop)
          //   }
          // }

          if (typeof value === 'object'
            && value
            && !(value instanceof HTMLElement
              || value instanceof SVGElement
              || value instanceof RegExp
              || value['$$typeof']//React element
            )) {
            return ValCache.get(prop, value,
              () => {
                return proxy(value, curProxyNode, namespace)
              })
          } else {
            return value
          }
        }
      },
      set(target, prop: string, value, receiver) {
        if (prop === '__proto__') {
          target[prop] = value
          return true
        }

        // if(prop==='length'){
        //   debugger
        // }

        const preVal = target[prop]
        if (preVal !== value || (Array.isArray(target) && prop && prop === 'length')) {

          const namespace = parentNS + '.' + prop

          if (snap) {
            let mmetas = target[META_IGNORE]
            let notIgnore = !(mmetas && mmetas[prop])
            //if (notIgnore && (!curXpath && props[prop] || curXpath)) {
            if (notIgnore) {
              snap.setUndo(receiver, prop, preVal)
            }
          }

          const descr = getPropertyDescriptor(target, prop)
          if (descr && descr.set) {//Ignore getter(no setter) in target
            descr.set.call(receiver, value)
          } else {
            target[prop] = value
          }

          doWatch(curProxyNode, namespace, prop, value, preVal)

          agent.update(namespace, prop, value)

          //from...joinTo
          if (joinToAry.length > 0) {
            joinToAry.find(({to, mapping}) => {
              const foundF = mapping.find(([fprop, tprop]) => {
                if (`.${fprop}` === namespace) {
                  const toAry = tprop.split('.')

                  let nowTo = to
                  toAry.forEach((name, i) => {
                    const toName = toAry[i]
                    if (i === toAry.length - 1) {
                      nowTo[toName] = value
                    } else {
                      nowTo = nowTo[toName]
                    }
                  })
                  return true
                }
              })

              if (!foundF) {
                const fromAry = namespace.replace(/^\./, '').split('.')

                let nowTo = to

                fromAry.forEach((name, i) => {
                  if (typeof (nowTo) === 'object' && nowTo) {
                    const fromName = fromAry[i]
                    if (i === fromAry.length - 1) {
                      // if (fromName.match(/editAry$$/gi)) {
                      //   debugger
                      // }
                      nowTo[fromName] = value
                    } else {
                      nowTo = nowTo[fromName]
                    }
                  } else {
                    return false
                  }
                })
              }
            })
          }

          if (Array.isArray(target) && prop.match(/^(\d+)|length$/)) {
            //const map = appendRXUIVal(getOriginal(target), 'updaters')

            //const map = updaterReg.get(getOriginal(target))

            // if (map) {
            //   map.forEach((set, agent: any) => {
            //     set.forEach(prop => {
            //       agent.update(namespace, prop, value)
            //     })
            //   })
            // }
            const aryPropName = parentNS.match(/\.([^\.]+)$/)?.[1]
            doWatch(curProxyNode, parentNS, aryPropName, target, target)
          }
        }
        return true
      }
    })

    curProxyNode.proxy = result

    return result
  }

  return proxy(source, null as any)
}

export function getOriginal(obj) {
  return typeof (obj) === 'object' && obj ? (obj[PROP_ORIGINAL] || obj) : obj
}

export function isObservable(obj) {
  return typeof obj === 'object' && obj && ([IS_OBSERVABLE_OBJECT] in obj)
}

export function isObservableWithExpectTo(obj) {
  return isObservable(obj) && obj[PROP_IS_EXPECTTO]
}

export function pushWatcher(watcher: T_Watcher) {
  if (isObservable(watcher.target)) {
    watcher.target[METHOD_PUSH_WATCH](watcher)
  }
}

export function pushJoinTo(fromOne, toOne, mapping) {
  fromOne[METHOD_PUSH_JOIN_TO](toOne, mapping)
}

export function pushJoinFrom(toOne, fromOne, mapping) {
  toOne[METHOD_PUSH_JOIN_FROM](fromOne, mapping)
}

//const appendCache = regGlobalObject('appendCache',new WeakMap<{}, {}>())

// function appendRXUIVal(val, prop, fn?) {
//   let rtnVal
//   let append = val[RXUI_APPEND]
//   // if(append===void 0){
//   //   append = appendCache.get(val)
//   // }
//   if (append === void 0) {
//     //if (Object.isExtensible(val)) {
//     try {
//       Object.defineProperty(val, RXUI_APPEND, {
//         value: append = {},
//         writable: false,
//         enumerable: false,
//         configurable: true
//       })
//     } catch (ex) {
//       return val
//       // debugger
//       // append = {}
//       // appendCache.set(val,append)
//     }
//
//     // }else{
//     //   debugger
//     // }
//   }
//
//   if (append) {
//     rtnVal = append[prop]
//     if (!rtnVal && typeof fn === 'function') {
//       append[prop] = rtnVal = fn()
//     }
//   }
//
//   return fn()
//
//   return rtnVal
// }

function findImplInPipe(typeClass, pro, thenEmitTo) {
  if (thenEmitTo.direction === 'parents') {
    let processor
    let parentNode = thenEmitTo.node.parent
    while (parentNode) {
      if (parentNode.implementAry) {
        if (parentNode.implementAry.find(emit => {
          if (emit.type === typeClass && emit.direction === 'children') {
            try {
              processor = emit.proxy[pro]
            } catch (ex) {
              if (!(ex instanceof ObservableNotFoundErr)) {
                throw ex
              }
            }
            if (processor !== void 0) {
              return true
            }
          }
        })) {
          break
        }
      }
      parentNode = parentNode.parent
    }
    if (typeof processor === 'function') {
      return processor
    }
    // else {
    //   throw new Error(`No implements found for(${pro})`)
    // }
  } else if (thenEmitTo.direction === 'children') {
    const processerAry = [], scan = (children) => {
      if (children && children.length > 0) {
        children.forEach(node => {
          if (!node.implementAry || !node.implementAry.find(emit => {
            if (emit.type === typeClass) {
              let rst
              try {
                rst = emit.proxy[pro]
              } catch (ex) {
                if (!(ex instanceof ObservableNotFoundErr)) {
                  throw ex
                }
              }
              if (rst !== void 0) {
                processerAry.push(rst)
                return true
              }
            }
          })) {
            scan(node.children)
          }
        })
      }
    }
    const children = thenEmitTo.node.children
    scan(children)

    if (processerAry.length > 0) {
      return processerAry

      // let ary = []
      // processerAry.forEach(processer => {
      //   ary.push(processer(...args))
      // })
      // return ary.length == 1 ? ary[0] : ary
    }
  // else {
  //     throw new Error(`No implements found for(${pro})`)
  //   }
  }
}