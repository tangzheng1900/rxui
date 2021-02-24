import {isObservable, pushWatcher} from "./observable";
import {useMemo} from "react";
import {Responsive} from "./responsive";

export default function useWatcher(target: {},
                                   on: string,
                                   watcher: (prop: string, value: any, preValue?: any) => void): void {
  useMemo(() => {
    // if(target===void 0||target===undefined||target===null){
    //   return
    // }
    const errorMsg = `useWatcher(target:Observable,on:string,callback:(prop: string, value: any, preValue?: any) => void).`
    if (!isObservable(target)) {
      //throw new Error(errorMsg)
      return
    }
    if (typeof on !== 'string') {
      throw new Error(errorMsg)
    }
    if (typeof watcher !== 'function') {
      throw new Error(errorMsg)
    }

    const node = Responsive.regListener('observer')
    pushWatcher({
      target: target,
      on: on,
      exe: watcher,
      node
    })
  }, [])
}