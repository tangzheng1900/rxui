import pkg from '../package.json'

console.log(`%c ${pkg.name} %c@${pkg.version}`,`color:#FFF;background:#fa6400`,``,``)

import useObservable from './rx/useObservable'
import useComputed from './rx/useComputed'
import useWatcher from "./rx/useWatcher";
import useOnce from './rx/useOnce'
import observable from './rx/observable'
import observe from './rx/observe'
import implement from './rx/implement'
import from from './rx/from'
import fork from './rx/fork'
import render from './rx/render'

import {Responsive} from './rx/responsive'

//const igonreObservableBefore = Responsive.igonreObservableBefore
const stopWatch = Responsive.stopWatch

export {
  //igonreObservableBefore,
  stopWatch,
  render,
  useObservable,
  useComputed,
  useWatcher,
  useOnce,
  observe,
  observable,
  implement,
  from,
  fork
}
export {undo, redo, takeSnap} from './rx/undo-redo'

//-------------------------------------------------------------------------

export {Serializable, Ignore} from './model/decorators'
export {dump, load, recycle, clone, ignore} from './model'

//-------------------------------------------------------------------------

export {dragable,getPositionInKonva,getPosition} from './dom/helper'
export {evt} from './dom/events'

export {uuid} from './util'
