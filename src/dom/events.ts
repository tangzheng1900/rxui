type WrapEvent = {
  stop: WrapEvent
  prevent: WrapEvent
  capture(event: Event): WrapEvent
  self(event: Event): WrapEvent
  once(event: Event): WrapEvent
}

export function evt(callback?): WrapEvent {
  function fn(event) {
    callback&&callback(event)
  }

  const rtn = {
    stop(){

    },
    prevent(){}
  }

  fn.stop = function(event) {
    event.stopPropagation()
    fn(event)
  }

  fn.prevent = function(event) {
    event.preventDefault()
    fn(event)
  }

  fn.stop.prevent = function(event) {
    event.preventDefault()
    fn.stop(event)
  }

  return fn as WrapEvent
}

//TODO
// export function evt(callback?): WrapEvent {
//   function fn(event) {
//     callback&&callback(event)
//   }
//
//   const rtn = {
//     stop(){
//
//     },
//     prevent(){}
//   }
//
//   fn.stop = function(event) {
//     event.stopPropagation()
//     fn(event)
//   }
//
//   fn.prevent = function(event) {
//     event.preventDefault()
//     fn(event)
//   }
//
//   fn.stop.prevent = function(event) {
//     event.preventDefault()
//     fn.stop(event)
//   }
//
//   return fn as WrapEvent
// }
