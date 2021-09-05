import React, {memo, ReactElement, useCallback, useEffect, useMemo, useState} from 'react'
import {Responsive} from './responsive'
import {render as reactDomRender, Renderer, unstable_batchedUpdates} from 'react-dom'
import {ReactEvents} from './events'
import {regGlobalObject, uuid} from '../util';
import {T_NodeInfo} from '../../types';

const {ReactCurrentDispatcher} = React['__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED'];//Sorry bro,i have to use this fucking API

const PARENT_NODEINFO_ID = '_cur_parent_info_'
export const PARENT_NODE_INFO = '_parent_info_'
const RENDER_IN_NODEINFO = '_render_in_node_info_'

export const CurrentNodeInfo: { current: T_NodeInfo } = regGlobalObject('CurrentNodeInfo', {} as any)

function enhance<T extends object>(component: React.FunctionComponent<T>) {

  component.prototype = {
    __reactAutoBindPairs: []
  }

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
                //unstable_batchedUpdates(() => {
                rtn = fn(...args)
                //})
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

    CurrentNodeInfo.current = curNodeInfo.parent//recover//TODO test(before = void 0)

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

let oriCreateElement, rxuiCreateElement

function realRender(render, ...args): Renderer {
  const renderInRoot = {inRoot:true}
  if (!oriCreateElement) {//Singleton guarantee
    oriCreateElement = React.createElement
    React.createElement = rxuiCreateElement = function (...args) {
      if(!renderInRoot.inRoot&&!CurrentNodeInfo.current){//RXUI外部的组件
        // if(args[0]?.name==='RenderCom'){
        //   console.log('---->',args[0])
        //   debugger
        // }
        return oriCreateElement(...args)
      }
      // console.log(CurrentNodeInfo.current)
      //

      let fn
      if (args.length > 0 && typeof (fn = args[0]) === 'function') {
        //not class(extends React.Component) and not from create-react-class
        if (!fn.prototype ||
          !(fn.prototype instanceof React.Component) && fn.prototype.isReactComponent === void 0) {
          const enCom = enhanceComponent(fn)
          args.splice(0, 1, enCom)

          const prop = args[1] || {}

          try {
            Object.defineProperty(prop, PARENT_NODE_INFO, {
              value: React.createElement[PARENT_NODEINFO_ID],
              writable: false,
              enumerable: true,
              configurable: false
            })
          } catch (ex) {
            console.info(`Object.defineProperty 'PARENT_NODE_INFO' error,in object ${prop}.`)
            //debugger
          }

          //prop[PARENT_NODE_INFO] = React.createElement[PARENT_NODEINFO_ID]
          args.splice(1, 1, prop as any)
        }
        return oriCreateElement(...args)
      } else {
        if (typeof args[0] === 'string') {//Normal element
          const props = args[1] as object
          if (props) {
            const curNodeInfo = React.createElement[RENDER_IN_NODEINFO]
            if (curNodeInfo) {
              const infoId = curNodeInfo.id
              const nodeInfoForRender = CurrentNodeInfo.current

              ReactEvents.forEach(event => {
                let fn = props[event]
                if (typeof fn === 'function') {
                  props[event] = function (...args) {
                    const curNodeInfo = CurrentNodeInfo.current
                    CurrentNodeInfo.current = nodeInfoForRender

                    Responsive.curRT.setNodeInfoId(infoId)

                    let rtn
                    unstable_batchedUpdates(() => {
                      //console.log(Math.random())
                      rtn = fn(...args)
                    })
                    Responsive.curRT.clear()//Cancel it

                    CurrentNodeInfo.current = curNodeInfo
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
        return oriCreateElement(...args)
      }
    }
  }

  if (args.length > 0) {
    let arg0 = args[0]
    if (arg0) {
      if (typeof arg0 === 'function') {//Factory
        React.createElement = oriCreateElement
        try {
          arg0 = arg0()
        } catch (ex) {
          throw ex
        } finally {
          React.createElement = rxuiCreateElement
        }
      }

      // 第二次调用render方法时，arg0.type为Symbol(react.memo)//by Yankewen
      // 在开发模式，React.createElemenet方法会对type进行校验
      // 理论上不需要再进行校验了
      const comDef = arg0.type
      const props = arg0.props

      if (comDef) {
        const enCom = enhanceComponent(comDef)
        args.splice(0, 1, React.createElement(enCom, props))
      }
    }
  }

  const rst =  render.call(void 0, ...args) as any


  renderInRoot.inRoot = false
  return rst
}

type RXUIRender = {
  test:
    (render: Function, com: ReactElement | { (): ReactElement }) => Renderer
} & { (...args): Renderer }

const render: RXUIRender = function render(...args) {
  return realRender(reactDomRender, ...args)
} as RXUIRender

render.test = function (render, com) {
  return realRender(render, com)
}

export default render

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