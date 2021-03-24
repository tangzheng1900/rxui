import React, {memo, ReactElement, useCallback, useEffect, useMemo, useState} from 'react'
import {Responsive} from './responsive'
import {render as reactDomRender, Renderer} from 'react-dom'
import {ReactEvents} from './events'
import {regGlobalObject, uuid} from '../util';
import {T_NodeInfo} from '../../types';

const {ReactCurrentDispatcher} = React['__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'];//Sorry bro,i have to use this fucking API

const PARENT_NODEINFO_ID = '_cur_parent_info_'
export const PARENT_NODE_INFO = '_parent_info_'
const RENDER_IN_NODEINFO = '_render_in_node_info_'

export const CurrentNodeInfo: { current: T_NodeInfo } = regGlobalObject('CurrentNodeInfo', {} as any)

function enhance<T extends object>(component: React.FunctionComponent<T>) {
  function hoc(props, ref) {
    const oriUpdater = Responsive.getCurUpdater()

    const curNodeInfo = useMemo(() => {
      const info = {
        id: uuid(),
        component,
        name: component.name,
        parent: Responsive.searchNode(props[PARENT_NODE_INFO]),
        props
      }

      Responsive.regNode(info)
      return info
    }, [])

    CurrentNodeInfo.current = curNodeInfo

    React.createElement[PARENT_NODEINFO_ID] = curNodeInfo.id
    React.createElement[RENDER_IN_NODEINFO] = curNodeInfo

    const updater = {
      hoc,
      component,
      fiber: curNodeInfo,
      update: useForceUpdate(component)
    }

    useEffect(() => {
      return () => {
        Responsive.cleanUpdater(updater)
      }
    }, [])

    Responsive.setCurUpdater(updater)

    const curDispatcher = ReactCurrentDispatcher.current as any

    let oriUseEffectFn
    if (curDispatcher) {
      const oriUseMemo = curDispatcher['useMemo']
      oriUseEffectFn = curDispatcher['useEffect']

      if (curNodeInfo) {
        //Proxied useMemo,prevent observer-getter for observable objects
        if (oriUseMemo && !oriUseMemo['_rxui_']) {
          const fn = function (fn, other) {
            return oriUseMemo(function (...args) {
              const oriUpdater = Responsive.getCurUpdater()
              Responsive.setCurUpdater(void 0)//clear

              let rtn
              try {
                rtn = fn(...args)
              } catch (ex) {
                onError('useMemo', props, ex)
              } finally {
                Responsive.setCurUpdater(oriUpdater)
              }

              // if(rtn===void 0||rtn===null){
              //   rtn = React.createElement(React.Fragment)
              // }

              //console.log(rtn)

              return rtn
            }, other)
          }
          fn['_rxui_'] = true

          curDispatcher['useMemo'] = fn as any
        }

        //Other function(may use observables) maybe called in useEffect
        if (oriUseEffectFn && !oriUseEffectFn['_rxui_']) {
          const fn = function (fn, other) {
            return oriUseEffectFn(function (...args) {
              Responsive.curRT.setNodeInfoId(curNodeInfo.id)
              let rtn
              try {
                rtn = fn(...args)
              } catch (ex) {
                onError('useEffect', props, ex)
              } finally {
                Responsive.curRT.clear()//Cancel it
              }
              return rtn
            }, other)
          }
          fn['_rxui_'] = true
          curDispatcher['useEffect'] = fn as any
        }
      }
    }

    let rtn
    try {
      rtn = component(props, ref)
    } catch (ex) {
      rtn = onError('render', props, ex)
    }

    if (rtn === void 0 || rtn === null) {
      rtn = React.createElement(React.Fragment)
    }

    if (oriUseEffectFn) {
      curDispatcher['useEffect'] = oriUseEffectFn
    }

    if (oriUpdater) {
      Responsive.setCurUpdater(oriUpdater)//recover
    }

    CurrentNodeInfo.current = void 0//Clear

    React.createElement[RENDER_IN_NODEINFO] = curNodeInfo.parent
    return rtn
  }

  hoc.displayName = component.displayName || component.name

  return memo(hoc)
}


function onError(stage: 'render' | 'usememo' | 'useEffect', props, ex: Error) {
  if (props && (typeof props['_onError_'] == 'function' || typeof props['_onerror_'] == 'function')) {
    return (props['_onError_'] || props['_onerror_'])(ex, stage)
  } else {
    const parentInfo = props[PARENT_NODE_INFO]
    if (parentInfo) {
      const parentObj = Responsive.searchNode(parentInfo)
      if (parentObj.props) {
        return onError(stage, parentObj.props, ex)
      }
    }
    throw ex
  }
}

function useForceUpdate(component: React.FunctionComponent) {
  const [c, setC] = useState(0)
  return useCallback(updateNode => {
    // //
    // const node = Responsive.curRT.getNode()
    // //debugger
    // let isChilren = true
    // if(node&&updateNode){
    //   isChilren = updateNode.component===node.component
    //   if(!isChilren){
    //     let curParent = updateNode.fiber.parent
    //     while(curParent){
    //       if(curParent.component===node.component){
    //         isChilren = true
    //         break;
    //       }
    //       curParent = curParent.parent
    //     }
    //   }
    // }
    // if(!isChilren){
    //   debugger
    // }
    //try{
    setC(c => c + 1)
    // }catch(ex){
    //   console.error(ex)
    // }

  }, []);
}

let initCreateElement = false

function myRender(render, ...args): Renderer {
  if (!initCreateElement) {//Singleton guarantee
    initCreateElement = true
    let ceFn = React.createElement as Function
    React.createElement = function (...args) {
      let fn
      if (args.length > 0 && typeof (fn = args[0]) === 'function') {
        if (!(fn.prototype instanceof React.Component)) {//not class based
          const enCom = enhanceComponent(fn)
          args.splice(0, 1, enCom)

          const prop = args[1] || {}

          Object.defineProperty(prop, PARENT_NODE_INFO, {
            value: React.createElement[PARENT_NODEINFO_ID],
            writable: false,
            enumerable: true,
            configurable: false
          })

          //prop[PARENT_NODE_INFO] = React.createElement[PARENT_NODEINFO_ID]
          args.splice(1, 1, prop as any)
        }
        return ceFn(...args)
      } else {
        if (typeof args[0] === 'string') {//Normal element
          const props = args[1] as object
          if (props) {
            const curNodeInfo = React.createElement[RENDER_IN_NODEINFO]
            if (curNodeInfo) {
              const infoId = curNodeInfo.id
              ReactEvents.forEach(event => {
                let fn = props[event]
                if (typeof fn === 'function') {
                  props[event] = function (...args) {
                    Responsive.curRT.setNodeInfoId(infoId)
                    const rtn = fn(...args)
                    Responsive.curRT.clear()//Cancel it
                    return rtn
                  }
                }
              })
            }
          }
        } else {
          // if(args&&args[1]&&typeof(args[1])==='object'&&args[1]['form']){
          //   let F = args[0]
          //   args[0] = useMemo(()=>args[0],[])
          //   //debugger
          // }

        }
        return ceFn(...args)
      }
    }
  }

  let fn
  if (args.length > 0) {
    if (typeof (fn = args[0]) === 'function' ||
      typeof args[0] === 'object' && typeof (fn = args[0]['type']) === 'function') {
      const enCom = enhanceComponent(fn)
      args.splice(0, 1, React.createElement(enCom))
    }
  }

  return render.call(void 0, ...args) as any
}

type RXUIRender = {
  test:
    (render: Function, com: ReactElement) => Renderer
} & { (...args): Renderer }

const render: RXUIRender = function render(...args) {
  return myRender(reactDomRender, ...args)
} as RXUIRender

render.test = function (render, com) {
  return myRender(render, com)
}

export default render


// export function renderTest(com, render): Renderer {
//   if (!initCreateElement) {//Singleton guarantee
//     initCreateElement = true
//     let ceFn = React.createElement as Function
//     React.createElement = function (...args) {
//       let fn
//       if (args.length > 0 && typeof (fn = args[0]) === 'function') {
//         if (!(fn.prototype instanceof React.Component)) {//not class based
//           const enCom = enhanceComponent(fn)
//           args.splice(0, 1, enCom)
//
//           const prop = args[1] || {}
//
//           Object.defineProperty(prop, PARENT_NODE_INFO, {
//             value: React.createElement[PARENT_NODEINFO_ID],
//             writable: false,
//             enumerable: true,
//             configurable: false
//           })
//
//           //prop[PARENT_NODE_INFO] = React.createElement[PARENT_NODEINFO_ID]
//           args.splice(1, 1, prop as any)
//         }
//         return ceFn(...args)
//       } else {
//         if (typeof args[0] === 'string') {//Normal element
//           const props = args[1] as object
//           if (props) {
//             const curNodeInfo = React.createElement[RENDER_IN_NODEINFO]
//             if (curNodeInfo) {
//               const infoId = curNodeInfo.id
//               ReactEvents.forEach(event => {
//                 let fn = props[event]
//                 if (typeof fn === 'function') {
//                   props[event] = function (...args) {
//                     Responsive.curRT.setNodeInfoId(infoId)
//                     const rtn = fn(...args)
//                     Responsive.curRT.clear()//Cancel it
//                     return rtn
//                   }
//                 }
//               })
//             }
//           }
//         } else {
//           // if(args&&args[1]&&typeof(args[1])==='object'&&args[1]['form']){
//           //   let F = args[0]
//           //   args[0] = useMemo(()=>args[0],[])
//           //   //debugger
//           // }
//
//         }
//         return ceFn(...args)
//       }
//     }
//   }
//
//   const enCom = enhanceComponent(com)
//
//   return render(enCom) as any
// }


function enhanceComponent(fn: React.FunctionComponent) {
  const key = '_observed_'
  let obFn = fn[key]
  if (!obFn) {
    obFn = enhance(fn)
    try {
      fn[key] = obFn
    } catch (ex) {

    }
  }

  const props = Object.getOwnPropertyNames(fn)
  props && props.forEach(prop => {
    if (!/_observed_/.test(prop)) {
      //console.log(prop, fn[prop])
      try {
        obFn[prop] = fn[prop]
      } catch (ex) {
        console.error(ex)
      }
    }
  })

  return obFn
}