import {T_ComNode, T_NodeInfo, T_Updater} from '../../types'
import {CurrentNodeInfo} from './render';
import {regGlobalObject} from "../util";
import {unstable_batchedUpdates} from "react-dom";

const nodes: { [index: string]: T_ComNode } = regGlobalObject('nodes', {})

let nodesTree = null

let curRtNodeInfoId
let delaiedRtNodeInfoId

const IgnoreRx: { stopWatcher: boolean } = regGlobalObject('IgnoreRx', {stopWatcher: void 0})
let curUpdater: { cur: T_Updater } = regGlobalObject('curUpdater', {cur: void 0})
const batchStack: Array<Array<object>> = regGlobalObject('batchStack', [])

export namespace Responsive {
  export const curRT = {
    setNodeInfoId(nodeInfoId) {
      curRtNodeInfoId = nodeInfoId
    },
    setInfoIdForDelay() {//For dragable
      delaiedRtNodeInfoId = curRtNodeInfoId
    },
    getNode(): T_ComNode {
      const curNodeInfo = CurrentNodeInfo.current/////TODO
      if (curNodeInfo) {
        return nodes[curNodeInfo.id]
      }
      if (curRtNodeInfoId) {
        const rtn = nodes[curRtNodeInfoId]
        if (rtn) {
          return rtn
        }
      }
      if (delaiedRtNodeInfoId) {
        return nodes[delaiedRtNodeInfoId]
      }
    },
    clear() {
      curRtNodeInfoId = null
    },
    clearDelay() {//For dragable
      delaiedRtNodeInfoId = null
    }
  }

  export function regNode(info: T_NodeInfo) {
    const node = {
      id: info.id,
      props:info.props,
      component: info.component,
      componentName: info.name,
      parent: null,
      children: [],
      subjectAry: [],
      observerAry: [],
      implementAry:[]
    }
    nodes[node.id] = node

    if (!nodesTree) {
      nodesTree = node as any
    } else {
      let parentFiber = info.parent, parentNode
      if (parentFiber) {
        if (parentFiber.invalid) {
          return
        }
        parentNode = searchNode(parentFiber.id)
        if (!parentNode) {
          debugger
        }
        node.parent = parentNode
        parentNode.children.push(node)
      }
    }
  }

  export function regListener(type: 'subject' | 'observer'|'implement', obj?): T_ComNode {
    const curNodeInfo = CurrentNodeInfo.current
    if (!curNodeInfo) {
      throw new Error(`CurrentNodeInfo.current is undefined.`)
    }

    const node = searchNode(curNodeInfo.id)
    if (obj) {
      node[type + 'Ary'].push(obj)
    }
    return node
  }

  export function getCurNode(): T_ComNode {
    const curNodeInfo = CurrentNodeInfo.current
    if (!curNodeInfo) {
      throw new Error(`CurrentNodeInfo not found.`)
    }

    return searchNode(curNodeInfo.id)
  }

  export function searchNode(id): T_ComNode {
    return nodes[id]
  }

  export function setCurUpdater(updater: T_Updater) {
    if (curUpdater) {
      curUpdater.cur = updater
    }
  }

  export function getCurUpdater(): T_Updater {
    if (curUpdater) {
      return curUpdater.cur
    }
  }

  export function stopWatch(fn){
    IgnoreRx.stopWatcher = true
    try{
      return fn()
    }finally {
      IgnoreRx.stopWatcher = void 0
    }
  }

  export function igonreObservableBefore() {
    curUpdater = {}

    //curUpdater = void 0
    // Promise.resolve().then(() => {
    //   curUpdater = {}
    // })
  }

  export function cleanUpdater(updater: T_Updater) {
    const fiberId = updater.fiber.id
    const node = nodes[fiberId]
    if (node) {
      if (node.parent) {
        node.parent.children = node.parent.children.filter(nd => nd.id !== fiberId)
      }
    } else {
      throw new Error(`node[id=${fiberId}] not found.`)
    }

    updater.fiber.invalid = true
    nodes[fiberId].invalid = true//Set it invalid
    nodes[fiberId] = null
    delete nodes[fiberId]//GC

    // updaterAry.forEach(pros => {
    //   for (let pro in pros) {
    //     let tary = pros[pro]
    //     tary.forEach(({hoc, component, fiber, update}, idx) => {
    //       if (fiber === listener.fiber) {
    //         //console.warn('clean component:' + hoc.displayName)
    //         tary.splice(idx, 1)
    //       }
    //     })
    //     if(pros[pro].length<=0){
    //       debugger
    //       pros[pros] = null
    //       delete pros[pros]//GC
    //     }
    //   }
    // })
  }

  export function applyBatch() {
    const batch = []
    batchStack.push(batch)

    return {
      commit() {
        batchStack.pop()
        batch.forEach(updater => {
          if (updater && updater.fiber && !updater.fiber.invalid) {
            updater.update(updater)
          }
        })
      }, cancel() {
        batchStack.pop()
      }
    }
  }

  const UpdateAsyn = (function () {
    let queue: T_Updater[] = []
    let lock
    return {
      push(updater: T_Updater) {
        if (!queue.find(qup => isSameHoc(qup, updater))) {//Same component
          queue.push(updater)
        }

        if (!lock) {
          lock = 1

          Promise.resolve().then(() => {
            //stopListening(()=>{})
            lock = void 0
            //console.time('totalTime')

            //unstable_batchedUpdates(() => {
            queue.forEach((updater, idx) => {
              queue[idx] = void 0
              if (updater && updater.fiber && !updater.fiber.invalid) {
                // if(updater.warcher&&updater.warcher.indexOf(`.moduleNav[0].slot.comAry[0].debugs.UNDEFINED_FRAME_LABEL`)!==-1){
                //   debugger
                // }
                updater.update()
              } else {
                // console.warn(updater.warcher)
              }
              //queue[idx] = void 0
            })
            //})

            //console.timeEnd('totalTime')
            queue = queue.filter(up => up)
            //console.log(queue.length)
          })
          //   .catch(err=>{
          //   debugger
          //   console.log(err)
          //   //debugger
          // })
        }
      }
    }
  })()

  export function applyAgent<T extends Object>(): {
    push: { (namespace: string, property: string): void },
    update: { (namespace: string, property: string, value: string): void }
  } {
    const updaters: { [index: string]: Array<T_Updater> } = {}
    //updaterAry.push(updaters)

    const agent = {
      push(namespace: string, property: string) {
        if(IgnoreRx.stopWatcher){
          return
        }

        // if(property==='columns'){
        //   debugger
        // }

        let ary: Array<T_Updater> = updaters[property]
        if (!ary) {
          ary = updaters[property] = []
        }
        const curUpdater = Responsive.getCurUpdater()

        if (curUpdater) {
          // if(property==='columns'&&curUpdater.component.name==='EditItem'){
          //   debugger
          // }

          let ti
          if (!ary.find((updater, idx) => {
            if (isSameHoc(updater, curUpdater)) {
              ti = idx
              return true
            }
          })) {//Same component
            ary.push(curUpdater)
          } else {
            // debugger
            //const ti = ary.indexOf(curUpdater)
            if (ti >= 0) {
              //console.log(ary[ti] === curUpdater)
              ary[ti] = curUpdater//Update
            }

          }
        } else {
          //debugger
          // if(curUpdater&&curUpdater.hoc.name==='RenderComs'){
          //   debugger
          // }

          // if (/.hoverF$/.test(namespace)) {
          //   debugger
          //   console.log('push:::', namespace)
          // }
        }
      },
      update(namespace: string, property: string, value: any) {
//console.log(namespace,property,value)
        // if(property==='pageId'){
        //   debugger
        // }

        const warcherDesc = namespace + '=' +
          (typeof (value) === 'function' ? 'function' : typeof (value) === 'object' ? '{..}' : value)

        // if(warcher.endsWith(`display=>block`)){
        //   debugger
        // }

        const batch = batchStack[batchStack.length - 1]
        if (batch) {
          const upAry = updaters[property]
          if (upAry && upAry.length > 0) {
            upAry.forEach(updater => {
              if (!batch.find(nup => isSameHoc(nup, updater))) {
                updater.warcher = `[${updater.fiber.id}]${warcherDesc}`
                batch.push(updater)
              }
            })
          }
        } else {
          let ary
          if (ary = updaters[property]) {
            unstable_batchedUpdates(() => {
              updaters[property] = ary.map((updater: T_Updater) => {
                if (updater && updater.fiber && !updater.fiber.invalid) {
                  updater.warcher = `[${updater.fiber.id}]${warcherDesc}`

                  const curUpdater = Responsive.getCurUpdater()

                  // if(curUpdater){
                  //   if(curUpdater.fiber.id !== updater.fiber.id){
                  //     if (curRtNodeInfoId && curRtNodeInfoId === updater.fiber.id) {//In event
                  //       updater.update(updater)
                  //       //UpdateAsyn.push(updater)
                  //     } else {
                  //       UpdateAsyn.push(updater)
                  //     }
                  //   }else{//same
                  //
                  //   }
                  // }else{
                  //   updater.update(updater)
                  // }

                  if (curUpdater && curUpdater === updater) {//In same updater(useComputed)
                    //console.log(Math.random())
                    //debugger
                    //console.log(Math.random())
                    //return//TODO TEST
                  }

                  if (curRtNodeInfoId && curUpdater && curUpdater === updater) {
                    //console.log(Math.random())
                    return//UseEffect
                  }


                  //updater.update(updater)

                  if (curUpdater && curUpdater.fiber.id !== updater.fiber.id) {
                    if (curRtNodeInfoId && curRtNodeInfoId === updater.fiber.id) {//In event
                      updater.update(updater)
                      //UpdateAsyn.push(updater)
                    } else {
                      //console.log(Math.random())
                      UpdateAsyn.push(updater)
                    }
                  } else {
                    updater.update(updater)
                  }
                  return updater
                } else {
                  //console.log(updater)
                  return
                }
              }).filter(updater => updater)
            })

            if (updaters[property].length === 0) {
              updaters[property] = void 0
              delete updaters[property]
            }
          }
        }
      }
    }

    return agent
  }
}

function isSameHoc(one, two) {
  return one && two && (one.fiber.id === two.fiber.id) && (one.hoc === two.hoc)
  //return one.hoc === tow.hoc && one.fiber.id === tow.fiber.id
}

// const Track: { push, clear } = (function () {
//   const ary = []
//   return {
//     clear(uid: string) {
//       ary = ary.map(([id, node], idx) => {
//         if (id === uid) {
//           return void 0
//         }
//       }).filter(nd => nd !== void 0)
//     },
//     push(uid: string, node: T_ComNode) {
//       if (ary.find((nd, idx) => nd[1] === node)) {
//         throw new Error(`Maximum loops in observer founding:[${node.componentName} -> ${ary[ary.length - 1].componentName} -> ${node.componentName}]`)
//       }
//       ary.push([uid, node])
//     }
//   }
// })()
