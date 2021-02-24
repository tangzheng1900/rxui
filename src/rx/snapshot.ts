const REGEXE_BEFORE_SPLICE = /^before\@splice$/

import {getOriginal} from './observable'

export let snap: Snap | null

export function snapshot(listener?: Function) {
  snap = new Snap(listener);
  return snap
}

class Snap {
  listener

  sleeping: boolean

  private _undo = {
    states: [],
    reg: new WeakMap()
  }

  private _redo = {
    states: [],
    reg: new WeakMap()
  }

  constructor(listener?: Function) {
    this.listener = listener;
  }

  setUndo(obj, prop, val, useListener?) {
    if (this.sleeping) {
      return
    }
    if (this.set(obj, prop, val, this._undo) && this.listener) {
      if (useListener === void 0 || useListener === true) {
        this.listener(obj, prop, val)
      }
    }
  }

  setRedo(obj, prop, val, useListener?) {
    if (this.sleeping) {
      return
    }
    if (this.set(obj, prop, val, this._redo) && this.listener) {
      if (useListener === void 0 || useListener === true) {
        this.listener(obj, prop, val)
      }
    }
  }

  sleep(fn) {
    this.sleeping = true
    try {
      if (typeof fn === 'function') {
        fn()
      }
    } catch (ex) {
      throw ex
    } finally {
      this.sleeping = false
    }
  }

  dump() {
    snap = null;
    return this;
  }

  undo() {
    snap = null
    this._undo.states.forEach(({obj, prop, val}) => {
      this.setRedo(obj, prop, isPropOfSpliceBefore(prop) ? obj : obj[prop], false)//curVal
      this.setVal(obj, prop, val)//oriVal
    })
  }

  redo() {
    snap = null;
    this._redo.states.forEach(({obj, prop, val}) => {
      this.setUndo(obj, prop, isPropOfSpliceBefore(prop) ? val : obj[prop], false);
      // if(prop==='items'){
      //   debugger
      // }
      this.setVal(obj, prop, val)
    })
  }

  cancel() {
    snap = null;
  }

  private set(obj, prop, val, pro: { states: Array, reg: WeakMap }) {
    let reg = pro.reg.get(obj);
    if (!reg) {
      reg = {};
      pro.reg.set(obj, reg)
    }
    if (!(prop in reg)) {//Original states
      reg[prop] = val

      if (Array.isArray(obj) && isPropOfSpliceBefore(prop)) {//Splice in array
        const copied = []
        obj.forEach(item => copied.push(item))

        pro.states.push({obj, prop, val: copied})
      } else {
        pro.states.push({obj, prop, val})
      }
      return true;
    }
  }

  private setVal(obj, prop, val) {
    if (Array.isArray(obj)) {//Recover from delete
      //const oriObj = getOriginal(obj)
      const oriObj = obj
      if (isPropOfSpliceBefore(prop)) {
        oriObj.splice(0, obj.length)
        val.forEach(ci => {
          obj.push(ci)
        })
      } else {
        if (prop.match(/^\d+$/) && val === void 0) {//delete
          obj.splice(parseInt(prop), 1)
        } else if (prop !== 'length') {//Ignore length
          //debugger TODO
          obj[prop] = val
        }
      }
    } else {
      obj[prop] = val
    }
    if (this.listener) {
      this.listener(obj, prop, val);
    }
  }
}

function isPropOfSpliceBefore(prop) {
  return prop.match(REGEXE_BEFORE_SPLICE)
}