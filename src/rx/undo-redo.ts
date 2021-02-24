import {snapshot} from "./snapshot";
import observable from "./observable";

let curAction

const Undo = (stack => {
  return {
    push(v) {
      stack.push(v);
      this.handler.size += 1;
    },
    handler: observable({
      name: 'Undo',
      size: stack.length,
      exe() {
        if (stack.length <= 1)
          return;
        const snap = stack.pop();
        (snap as any).undo()

        Undo.handler.size -= 1

        Redo.push(snap);
      }
    })
  }
})([{}])

const Redo = (stack => {
  return {
    push(v) {
      stack.push(v);
      this.handler.size += 1;
    },
    handler: observable({
      name: 'Redo',
      size: stack.length,
      exe() {
        if (stack.length <= 1)
          return;
        const snap = stack.pop();
        (snap as any).redo()
        Redo.handler.size -= 1
        Undo.push(snap)
      }
    })
  }
})([{}])

export const undo = Undo.handler
export const redo = Redo.handler

let waitForCommit: { from: number, until: number, dump: {} }

function waitToCommit(last) {
  setTimeout(v => {
    if (waitForCommit) {
      const lastTime = waitForCommit.until - (new Date().getTime() - waitForCommit.from)

      if (lastTime <= 0) {
        Undo.push(waitForCommit.dump)
        waitForCommit = void 0
      } else {
        waitToCommit(lastTime)
      }
    }
  }, last)
}

export function takeSnap(action: string, listener?: Function) {
  // if (curAction !== undefined) {
  //   throw new Error(`Action[${curAction}] is still running when action [${action}] is running ....`)
  // }

  if (waitForCommit) {
    if (curAction !== action) {
      Undo.push(waitForCommit.dump)
      waitForCommit = void 0
      curAction = void 0
    } else {
      if (waitForCommit.until > 0 && (new Date().getTime() - waitForCommit.from > waitForCommit.until)) {
        Undo.push(waitForCommit.dump)
        waitForCommit = void 0
      } else {
        return {
          on(callback: Function) {

          },
          wait(){

          },
          commit(opt?: { wait: number }) {
            if (waitForCommit.until < 0) {
              if (opt && opt.wait) {
                waitForCommit.from = new Date().getTime()//Update from
                waitToCommit(waitForCommit.until)
              } else {
                Undo.push(waitForCommit.dump)
                waitForCommit = void 0
              }
            } else {
              let last = waitForCommit.until - (new Date().getTime() - waitForCommit.from)
              //console.log(last)
              if (last <= 0) {
                Undo.push(waitForCommit.dump)
                waitForCommit = void 0
                return
              } else {
                if (opt && opt.wait) {
                  waitForCommit.from = new Date().getTime()//Update from
                  last = waitForCommit.until
                }

                waitToCommit(last)
              }
            }
          }, cancel() {
            curAction = undefined
            snap.undo()
          }
        }
      }
    }
  }

  curAction = action
  let snap = snapshot(listener)

  return {
    on(callback: Function) {

    },
    wait() {
      if (!waitForCommit) {
        const dump = snap.dump()
        waitForCommit = {from: new Date().getTime(), until: -1, dump}
      }
    },
    commit(opt?: { wait: number }) {
      const dump = snap.dump()
      if (opt && opt.wait) {
        //console.log(opt.wait)

        waitForCommit = {from: new Date().getTime(), until: opt.wait, dump}
      } else {
        curAction = undefined
        Undo.push(dump)
      }
    },
    cancel() {
      curAction = undefined
      snap.undo()
    }
  }
}

