import {T_ObserverCfg} from '../../types'
import {useCallback, useEffect, useRef} from 'react'
import {Responsive} from './responsive'
import {isObservable, pushWatcher, RXUI_APPEND} from "./observable";
import getCurNode = Responsive.getCurNode;
import {ObservableNotFoundErr} from "./errors";

type T_RefType = { proxy: {}, watcherPushed: {}, implVal: {} }

export default function observe<T>(typeClass, impl, config: T_ObserverCfg, updater): T {
  const args = [...arguments]

  config = args.find(arg => typeof (arg) === 'object')
  updater = args.find(arg => Array.isArray(arg))

  let ref
  if (config && (config.from || config?.expectTo)) {
    ref = useRef<T_RefType>()
  } else {
    ref = {}
    if (updater) {
      throw new Error(`Updater can not be used here.`)
    }
  }

  let noCurrent: boolean = !ref.current
  if (ref === void 0 || !ref.current) {
    if (arguments.length < 0) {
      throw new Error(`invalid arguments,expect <T>(class:new ()=>T).`)
    }
    if (typeof typeClass !== 'function' || !typeClass) {
      throw new Error(`invalid arguments,expect <T>(class:new ()=>T).`)
    }
    // if (implOrCfg !== void 0 && (typeof implOrCfg !== 'object' && typeof implOrCfg !== 'function')) {
    //   throw new Error(`invalid arguments,expect <T>(class:new ()=>T,impOrConfig:Function|{from?:'children'|'parents',expectTo?:'children'|'parents'}).`)
    // }

    const currentVal: T_RefType = {watcherPushed: {}} as T_RefType

    if (typeof impl === 'function') {
      const tval = impl(impl => {
        if (impl && typeof impl === 'object') {
          currentVal.implVal = impl
          return true
        }
      })
      if (typeof tval === 'object') {
        currentVal.implVal = tval
      }
    }

    function doExpectTo(pro: string, fn?: Function) {
      let fAry
      try {
        fAry = searchGetter('observer', typeClass, config.expectTo, node, pro)
      } catch (ex) {
        if (!fn) {
          throw ex
        }
        fAry = []
        //Not found
      }
      if (!Array.isArray(fAry)) {
        if (typeof (fAry) === 'function') {
          fAry = [fAry]
        } else {
          throw new Error(`ExpectTo's value must be a Function type.`)
        }
      }

      return (...args) => {
        fn && fAry.push(fn)
        let ary = []
        fAry.forEach(processer => {
          ary.push(processer(...args))
        })
        return ary.length == 1 ? ary[0] : ary
      }
    }

    const nodeProxy = new Proxy({}, {
      get(target, pro: string) {
        if (pro === 'toString'
          || pro === 'valueOf'
          || pro === '$$typeof'
          || pro === 'constructor'
          || pro === Symbol.toPrimitive
          || pro === Symbol.toStringTag
          || pro === Symbol.iterator
          || pro === RXUI_APPEND) {
          return target[pro]
        }

        if (currentVal.implVal) {
          let rtn = currentVal.implVal[pro]
          if (rtn !== void 0) {
            if (config?.expectTo) {
              if (typeof rtn !== 'function') {
                throw new Error(`ExpectTo's value must be a Function type.`)
              }
              return doExpectTo(pro, rtn)
            }
            return rtn
          }
        }
        if (config?.expectTo) {//Must be a function
          return doExpectTo(pro)
        } else if (config?.from) {
          const val = searchGetter('subject', typeClass, config?.from, node, pro)
          let watcher
          if (!(currentVal.watcherPushed[pro]) && isObservable(val)
            && typeof config.watch === 'object' && (watcher = config.watch)) {
            currentVal.watcherPushed[pro] = true
            const regexe = new RegExp(`^${pro}.(.+)$`)
            if (watcher.on.match(regexe)) {
              pushWatcher({
                target: val,
                on: watcher.on.replace(regexe, '$1'),
                exe: watcher.exe,
                node
              })
            }
          }///////TODO DEBUG

          if (!currentVal.implVal) {
            return val
          }
        } else {
          const tnode = Responsive.curRT.getNode()
          if (tnode && tnode.subjectAry) {
            let rtn
            tnode.subjectAry.find(subject => {
              if (subject.direction === 'self' && subject.type === typeClass) {
                rtn = subject.proxy[pro]
                return true
              }
            })
            return rtn
          }
        }
      }, set(target, pro, val) {
        let nnode = node, direction = config?.from
        if (!direction) {
          direction = 'self'
          nnode = Responsive.curRT.getNode()
        }
        if (nnode) {
          searchSetter('subject', typeClass, direction, nnode, pro, val)
        }
        return true
      }
    })

    let node
    if (config && config.from) {
      node = Responsive.regListener('observer', {
        type: typeClass,
        direction: config.from,
        proxy: nodeProxy
      })

      //Reg for self search
      Responsive.regListener('subject', {
        type: typeClass,
        direction: 'self',
        proxy: nodeProxy
      })
    }
    currentVal.proxy = nodeProxy
    ref.current = currentVal
  }

  if (updater) {
    const ifUpdate = [...updater]

    const fn = useCallback(() => {
      if (updater && !noCurrent) {
        const implVal = ref.current.implVal

        if (typeof impl === 'function') {
          impl(impl => {
            if (impl && typeof impl === 'object') {
              for (let k in impl) {
                implVal[k] = impl[k]
              }
              return true
            }
          })
        }
      }
    }, ifUpdate)

    useEffect(fn, ifUpdate)
  }

  return ref.current.proxy
}

function searchObservable(typeClass, direction, node) {
  const type = 'subjectAry'
  if (direction === 'parents') {
    let rtn
    let parentNode = node.parent
    while (parentNode) {
      if (parentNode[type]) {
        if (parentNode[type].find(on => {
          if (on.direction !== direction
            && on.direction !== 'self'
            && on.type === typeClass) {
            rtn = on
            return true
          }
        })) {
          break
        }
      }
      parentNode = parentNode.parent
    }
    return rtn
  } else if (direction === 'children') {
    let rtn, scan = children => {
      if (children && children.length > 0) {
        children.find(node => {
          if (!node[type] || !node[type].find(on => {
            if (on.direction !== direction
              && on.direction !== 'self'
              && on.type === typeClass) {
              rtn = on
              return true
            }
          })) {
            return scan(node.children)
          }
        })
      }
    }

    const children = node.children
    scan(children)

    return rtn
  }
}

function searchGetter(type, typeClass, direction, node, pro) {
  type += 'Ary'
  if (direction === 'parents') {
    let proxy,rtn
    let parentNode = node.parent
    while (parentNode) {
      if (parentNode[type]) {
        if (parentNode[type].find(on => {
          if (on.direction !== direction
            && on.direction !== 'self'
            && on.type === typeClass) {
            proxy = on.proxy
            //rtn = on.proxy[pro]
            return true
          }
        })) {
          break
        }
      }
      parentNode = parentNode.parent
    }

    // if(proxy===void 0){
    //   debugger
    // }

    //return proxy&&proxy[pro]

    if (proxy === void 0) {
      //throw new ObservableNotFoundErr(`No Observable(${typeClass.name}) found in parents components.`)
    } else {
      return proxy[pro]
    }
  } else if (direction === 'children') {
    const processerAry = [], scan = (children) => {
      if (children && children.length > 0) {
        children.forEach(node => {
          if (!node[type] || !node[type].find(on => {
            if (on.direction !== direction
              && on.direction !== 'self'
              && on.type === typeClass) {
              let rst
              try{
                rst = on.proxy[pro]
              }catch(ex){
                if(!(ex instanceof ObservableNotFoundErr)){
                  throw ex
                }
              }
              if (rst !== void 0) {
                // if(processerAry.length>0){
                //   debugger
                // }
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
    const children = node.children
    scan(children)

    if (processerAry.length > 0) {
      return processerAry
    } else {
      throw new Error(`No implements found for(${pro})`)
    }
  }
}

function searchSetter(type, typeClass, direction, node, pro, val) {
  type += 'Ary'
  if (direction === 'parents') {
    let parentNode = node.parent
    while (parentNode) {
      if (parentNode[type]) {
        if (parentNode[type].find(on => {
          if (on.type === typeClass) {
            return on.proxy[pro] = val
          }
        })) {
          break
        }
      }
      parentNode = parentNode.parent
    }
  } else if (direction === 'children') {
    const scan = (children) => {
      if (children && children.length > 0) {
        children.forEach(node => {
          if (!node[type] || !node[type].find(on => {
            if (on.type === typeClass) {
              on.proxy[pro] = val
              return true
            }
          })) {
            scan(node.children)
          }
        })
      }
    }
    const children = node.children
    scan(children)
  } else if (direction === 'self') {
    if (node.subjectAry) {
      node.subjectAry.find(subject => {
        if (subject.direction === 'self' && subject.type === typeClass) {
          subject.proxy[pro] = val
          return true
        }
      })
    }
  }
}