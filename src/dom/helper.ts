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
  if (e.evt instanceof MouseEvent) {//Konva
    return dragableForKonva(...arguments)
  } else {//normal
    return dragableForDoms(...arguments)
  }
}

function dragableForKonva(e, dragingFn, options?) {
  const node = e.currentTarget,
    stage = node.getStage(),
    absPo = getPositionInKonva(node)

  const po = {x: absPo.x, y: absPo.y, w: node.width(), h: node.height()}
  e = e.evt

  let odx = e.pageX - po.x, ody = e.pageY - po.y;
  let x, y, ex, ey;
  let state;

  let parentPo = {x: 0, y: 0}

  if (dragingFn) {
    Responsive.curRT.setInfoIdForDelay()//Delay until released when mouseup

    const handleMouseMove = (e, finish?) => {
      const dx = (e.pageX - odx - x) || 0, dy = (e.pageY - ody - y) || 0;
      x = e.pageX - odx;
      y = e.pageY - ody;
      ex = e.pageX - parentPo.x;
      ey = e.pageY - parentPo.y;

      //console.log(dx,dy,dragingFn)

      if (finish||(dx != 0 || dy != 0)) {
        state = finish?'finish':(state ? 'moving' : 'start')
        //stopWatch(()=>{
        dragingFn({
          po: {x, y}, epo: {ex, ey}, dpo: {dx, dy},
          targetStyle: po
        }, state, node)
        //})
      }
    }

    let moving = false

    stage.on('mousemove',e => {
      if (!moving) {
        moving = true
        //if (options && options['safe']) {
        dragable.event = e
        //}
      }
      try {
        handleMouseMove(e.evt)
      } catch (ex) {
        console.error(ex)
      }
    })

    // document.onmousemove = e => {
    //   //console.log(Math.random())
    //
    //
    //   if (!moving) {
    //     moving = true
    //     //if (options && options['safe']) {
    //     dragable.event = e
    //     //}
    //   }
    //   try {
    //     handleMouseMove(e)
    //   } catch (ex) {
    //     console.error(ex)
    //   }
    // }

    const mouseup = e => {
      setTimeout(() => dragable.event = undefined)
      try {
        const batch = Responsive.applyBatch()
        if (state) {
          handleMouseMove(e.evt||e, 'finish')

          //ignoreRx(()=>{
          // dragingFn({
          //     po: {x, y}, epo: {ex, ey}, dpo: {dx: 0, dy: 0},
          //     targetStyle:po
          //   }
          //   , 'finish', node)
          //})
        }
        batch.commit()
      } catch (ex) {
        throw ex
      } finally {
        //node.off('mouseup')

        stage.off('mousemove')
        stage.off('mouseup')

        // document.onmouseup = void 0
        // document.onmousemove = void 0

        Responsive.curRT.clearDelay()//Release
      }
    }

    //document.onmouseup = mouseup
    stage.on('mouseup', mouseup)
  } else {
    return po;
  }
}


function dragableForDoms(e, dragingFn, options?) {
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
      try {
        handleMouseMove(e)
      } catch (ex) {
        console.error(ex)
      }
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

export function getPositionInKonva(node, relativeNode?) {
  // if(!ele) debugger
  if (relativeNode) {
    const absPo = node.getAbsolutePosition(),
      relativePo = relativeNode.getAbsolutePosition()

    return {
      x: absPo.x-relativePo.x,
      y: absPo.y - relativePo.y,
      w: node.width(),
      h: node.height()
    }
  } else {
    //console.time('start')
    const absPo = node.getAbsolutePosition()
    const stage = node.getStage()

    if (stage && stage.content instanceof HTMLElement) {
      const po = stage.content.getBoundingClientRect()
      //console.timeEnd('start')
      return {x: absPo.x + po.left, y: absPo.y + po.top, w: node.width(), h: node.height()}
    }
  }
}
