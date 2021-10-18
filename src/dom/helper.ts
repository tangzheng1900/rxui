/**
 * Drag support
 * @param e:Event
 * @param po:{x:number,y:number} current position
 * @param epo:{ex:number,ey:number} event position(relative to parent dom)
 * @param dpo:{dx:number,dy:number} step distance
 *
 * @param dragingFn invoking function
 */
import {Responsive} from "../rx/responsive";
import {stopWatch} from "../index";

interface Dragable {
  event?: object

  (e, dragingFn, options?): void
}

export const dragable: Dragable = function (e, dragingFn, options?) {
  const dom = e.currentTarget, w = dom.offsetWidth, h = dom.offsetHeight,
    relDom = arguments.length == 3 && options && options['relDom'],
    zoom = arguments.length == 3 && options && options['zoom'] || 1,
    po = getPosition(dom, relDom),
    parentPo = relDom ? getPosition(relDom) : {x: 0, y: 0};

  let odx = e.pageX - po.x, ody = e.pageY - po.y;
  let x, y, ex, ey;
  let state;

  if (dragingFn) {
    Responsive.curRT.setInfoIdForDelay()//Delay until released when mouseup

    const handleMouseMove = e => {
      let dx = (e.pageX - odx - x) || 0, dy = (e.pageY - ody - y) || 0;
      x = e.pageX - odx;
      y = e.pageY - ody;
      ex = e.pageX - parentPo.x;
      ey = e.pageY - parentPo.y;
      if (dx != 0 || dy != 0) {
        state = state ? 'moving' : 'start';

        //stopWatch(()=>{
          dragingFn({
            po: {x, y}, epo: {ex, ey}, dpo: {dx, dy},
            targetStyle: {x: po.x, y: po.y, w, h}
          }, state, dom)
        //})
      }
    }

    let moving = false
    document.onmousemove = e => {
      if (!moving) {
        moving = true
        //if (options && options['safe']) {
          dragable.event = e
        //}
      }
      handleMouseMove(e)
    }

    document.onmouseup = e => {
      setTimeout(() => dragable.event = undefined)
      try {
        const batch = Responsive.applyBatch()

        handleMouseMove(e)
        if (state) {
          //ignoreRx(()=>{
            dragingFn({
                po: {x, y}, epo: {ex, ey}, dpo: {dx: 0, dy: 0},
                targetStyle: {x: po.x, y: po.y, w, h}
              }
              , 'finish', dom)
          //})
        }
        batch.commit()
      } catch (ex) {
        throw ex
      } finally {
        document.onmousemove = null;
        document.onmouseup = null;

        Responsive.curRT.clearDelay()//Release
      }
    }
  } else {
    return po;
  }
}

export function inPosition(
  {x, y}: { x: number, y: number },
  {x: left, y: top, w, h}: { x: number, y: number, w: number, h: number }) {
  if (arguments[0] instanceof Node) {
    let po = getPosition(arguments[0])
    x = po.x
    y = po.y
  }
  if (arguments[1] instanceof Node) {
    let {x, y, w: tw, h: th} = getPosition((<Node>arguments[1]))
    left = x;
    top = y;
    w = tw;
    h = th;
  }

  return left < x && x < left + w
    &&
    top < y && y < top + h;
}

function getBoundingRect(element) {
  var style = window.getComputedStyle(element);
  var margin = {
    left: parseInt(style['margin-left']),
    right: parseInt(style['margin-right']),
    top: parseInt(style['margin-top']),
    bottom: parseInt(style['margin-bottom'])
  };
  var padding = {
    left: parseInt(style['padding-left']),
    right: parseInt(style['padding-right']),
    top: parseInt(style['padding-top']),
    bottom: parseInt(style['padding-bottom'])
  };
  var border = {
    left: parseInt(style['border-left']),
    right: parseInt(style['border-right']),
    top: parseInt(style['border-top']),
    bottom: parseInt(style['border-bottom'])
  };


  var rect = element.getBoundingClientRect();
  rect = {
    left: rect.left - margin.left,
    right: rect.right - margin.right - padding.left - padding.right,
    top: rect.top - margin.top,
    bottom: rect.bottom - margin.bottom - padding.top - padding.bottom - border.bottom
  };
  rect.width = rect.right - rect.left;
  rect.height = rect.bottom - rect.top;
  return rect;

};

/**
 * Get dom's position
 * @param ele
 * @param relativeDom ele's some ancestor dom
 */
export function getPosition(ele, relativeDom?) {
  // if(!ele) debugger
  if (relativeDom) {
    let currPo = ele.getBoundingClientRect()
    let targetPo = relativeDom.getBoundingClientRect()

    return {
      x: currPo.left - targetPo.left,
      y: currPo.top - targetPo.top,
      w: ele.offsetWidth,
      h: ele.offsetHeight
    }
  } else {
    let po = ele.getBoundingClientRect()
    return {x: po.left, y: po.top, w: ele.offsetWidth, h: ele.offsetHeight}
  }
}
