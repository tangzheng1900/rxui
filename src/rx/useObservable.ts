import {useCallback, useMemo, useRef} from 'react'
import {T_ComNode, T_EmitToObserver, T_ObservableCfg} from '../../types'
import {Responsive} from './responsive'

import observable, {getOriginal} from './observable';
import {store} from "../model/store";

const IS_OBSERVABLE_PROXY_OBJECT = '__observable_proxy__'


export default function useObservable<T>(typeClass, impl, config: T_ObservableCfg<T>, serailId: string, updater): T {
  const args = [...arguments]
  config = args.find(arg => typeof arg === 'object' ? arg : void 0)

  const ref = useRef<T>(null)

  let noCurrent: boolean = !ref.current
  if (noCurrent) {
    if (arguments.length < 1) {
      throw new Error(`invalid arguments,expect <T>(class:new ()=>T|T).`)
    }
    if ((typeof (typeClass) !== 'object' && typeof (typeClass) !== 'function') || !typeClass) {
      throw new Error(`invalid arguments,expect <T>(class:new ()=>T|T).`)
    }

    let implVal: object

    if (typeof typeClass === 'function') {
      implVal = new typeClass()
    } else {
      implVal = typeClass as object
    }

    let thenEmitTo = null

    const obsValue = observable(implVal, typeClass, config, () => thenEmitTo)

    if (typeof impl === 'function') {
      impl(impl => {
        if (impl && typeof impl === 'object') {
          //copyTo(impl, implVal)
          copyTo(impl, obsValue)///TODO
          // for (let k in impl) {
          //   obsValue[k] = impl[k]
          // }
          return true
        }
      })
    }

    if (typeof config === 'object') {
      if (config.to) {
        const thenET = proDirection(typeClass, obsValue, config.to)
        if (thenET) {
          thenEmitTo = thenET
        }
      } else if (config.expectTo) {
        const thenET = proDirection(typeClass, obsValue, config.expectTo)
        if (thenET) {
          thenEmitTo = thenET
        }
      }
      if (typeof config.init === 'function') {
        //config.init(obsValue)
        config.init(getOriginal(obsValue))
      }
    }

    proDirection(typeClass, obsValue, 'self')

    const serailId = args.find(arg => typeof arg === 'string' ? arg : void 0)
    if (serailId) {
      store(serailId, obsValue, typeClass)
    }

    ref.current = obsValue as T
  }

  updater = args.find(arg => Array.isArray(arg)) || []
  const ifUpdate = [...updater]

  const fn = useCallback(() => {
    if (updater && !noCurrent) {
      const obsValue = ref.current
      if (typeof (typeClass) !== 'function') {
        for (let k in typeClass) {
          const v = typeClass[k]
          obsValue[k] = v
        }
      } else {
        if (typeof impl === 'function') {
          impl(impl => {
            if (impl && typeof impl === 'object') {
              for (let k in impl) {
                obsValue[k] = impl[k]
              }
              return true
            }
          })
        }
      }

      if (typeof config?.init === 'function') {
        //config.init(obsValue)
        config.init(getOriginal(obsValue))
      }
    }
  }, ifUpdate)

  //useEffect(fn, ifUpdate)
  useMemo(fn, ifUpdate)

  return ref.current
}

function copyTo(from, target) {
  const props = Object.getOwnPropertyNames(from)

  props && props.forEach(k => {
    // if(k==='data'){
    //   debugger
    // }
    const tv = from[k]
    if (typeof tv === 'function') {
      if (k !== 'constructor') {
        target[k] = tv
      }
    } else {
      target[k] = tv
    }
  });

  const prop = Object.getPrototypeOf(from)
  if (prop && prop !== Object.prototype) {
    copyTo(prop, target)
  }
}

export function isObservableProxy(obj) {
  return typeof obj === 'object' && obj && ([IS_OBSERVABLE_PROXY_OBJECT] in obj)
}


function proDirection(typeClass, proxyVal, direction: T_EmitToObserver | 'self') {
  if (typeof (direction) !== 'string' || !/^(children|parents|self)$/gi.test(direction)) {
    throw new Error(`direction = 'children'|'parents' expect.`)
  }

  const proxy = new Proxy({}, {
    has(target, key) {
      return key === IS_OBSERVABLE_PROXY_OBJECT
        || key in target
    },
    get(target, pro: string) {
      let val = proxyVal[pro]
      return val
      // if (typeof (val) === 'function') {
      //   if(pro==='focus'){
      //     debugger
      //   }
      //   return function XXX(...args) {
      //     return val(...args)
      //   }
      // } else {
      //   return val
      // }
    }, set(target, pro: string, val) {
      proxyVal[pro] = val
      return true
    }
  })

  const node: T_ComNode = Responsive.regListener('subject', {
    type: typeClass,
    direction,
    proxy
  })

  if (node && direction !== 'self') {
    return {direction, node}
  }
}
