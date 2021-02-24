import {useCallback, useMemo, useRef, useState} from 'react';
import {Responsive} from './responsive';
import {CurrentNodeInfo, PARENT_NODE_INFO} from './render';

export default function useComputed<T>(fn: () => T): T {
  const ref = useRef({c: 0, fn})
  const [, refresh] = useState<number>()

  const preListener = Responsive.getCurUpdater()

  const curFiber = CurrentNodeInfo.current

  const updater = {
    component: preListener.component,
    hoc: ref.current.fn,
    fiber: curFiber,
    update: function () {
      //try{
      refresh(ref.current.c++)
      // }catch(ex){
      //   console.log(fn,curFiber)
      //   //debugger
      // }


      // const curUpdater = Responsive.getCurUpdater()
      // if (curUpdater && curUpdater.fiber.id !== this.fiber.id) {//Warning: Cannot update a component (`DesnCom`) while rendering a different component (`WithFrames`).
      //   setTimeout(() => {
      //     if(!this.fiber.invalid){
      //       debugger
      //       console.log(curUpdater.fiber,this.fiber)
      //       refresh(ref.current.c++)
      //     }else{
      //       debugger
      //     }
      //   })
      // } else {
      //   refresh(ref.current.c++)
      // }
    }
  }

  const cacheFn = useCallback<T>((...args) => {
    Responsive.setCurUpdater(updater)
    let rtn
    try {
      rtn = fn()
    } catch (ex) {
      if (updater.fiber && updater.fiber.props) {
        onError('render', updater.fiber.props, ex)
      } else {
        throw ex
      }
    } finally {
      Responsive.setCurUpdater(preListener)
    }

    return rtn
  }, [ref.current.c])

  const rtn = useMemo(cacheFn, [ref.current.c])

  return rtn as T
}

function onError(stage: 'render' | 'usememo' | 'useEffect', props, ex: Error) {
  if (props && (typeof props['_onError_'] == 'function' || typeof props['_onerror_'] == 'function')) {
    return (props['_onError_'] || props['_onerror_'])(ex, stage)
  }else{
    const parentInfo = props[PARENT_NODE_INFO]
    if(parentInfo) {
      const parentObj = Responsive.searchNode(parentInfo)
      if(parentObj.props){
        return onError(stage, parentObj.props, ex)
      }
    }
    throw ex
  }
}

//For useComputedChain

// export default function useComputed<T>(fn: () => T,callback?): T {
//   const ref = useRef({c: 0, fn})
//   const [, refresh] = useState<number>()
//
//   const preListener = Responsive.getCurUpdater()
//
//   const curFiber = CurrentNodeInfo.current
//
//   const updater = {
//     component: preListener.component,
//     hoc: ref.current.fn,
//     fiber: curFiber,
//     update: function () {
//       const curUpdater = Responsive.getCurUpdater()
//       if (curUpdater && curUpdater.fiber.id !== this.fiber.id) {//Warning: Cannot update a component (`DesnCom`) while rendering a different component (`WithFrames`).
//         setTimeout(() => refresh(ref.current.c++))
//       } else {
//         refresh(ref.current.c++)
//       }
//     }
//   }
//
//   if(!callback){
//     if(!curFiber.computedUpdaterAry){
//       curFiber.computedUpdaterAry = []
//     }
//     curFiber.computedUpdaterAry.push(updater)
//   }
//
//   const cacheFn = useCallback<T>((...args) => {
//     Responsive.setCurUpdater(updater)
//     const rtn = fn(...args)
//     Responsive.setCurUpdater(preListener)
//     return rtn
//   }, [ref.current.c])
//
//
//   const cacheFn1 = useCallback<T>((...args) => {
//     const cc = curFiber.computedUpdaterAry
//     debugger
//     let up = cc?cc[cc.length-1]:updater
//     Responsive.setCurUpdater(up)
//     const rtn = fn(...args)
//     Responsive.setCurUpdater(preListener)
//     return rtn
//   }, [ref.current.c])
//
//
//   if(callback){
//     //debugger
//     return cacheFn1
//   }
//
//   const rtn = useMemo(cacheFn, [ref.current.c])
//
//   if(!callback){
//     if(curFiber.computedUpdaterAry){
//       curFiber.computedUpdaterAry.pop()//Pop
//     }
//   }
//
//   return rtn as T
// }
