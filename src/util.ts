//export const UUID_REG: {} = regGlobalObject('_UUID_REG', {})

function UUID(len, radix) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  const uuid = []
  let i
  radix = radix || chars.length;

  if (len) {
    // Compact form
    for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
  } else {
    // rfc4122, version 4 form
    let r;

    // rfc4122 requires these characters
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    uuid[14] = '4';

    // Fill in random data. At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | Math.random() * 16;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
  }

  return uuid.join('');
}

export function uuid(pre: string = 'u_') {
  return pre + UUID(8, 16);
}

export function genFnName(fn: Function, className: string) {
  let fnName
  if (typeof className === 'string') {
    let ti = className.lastIndexOf('.')
    if (ti !== -1) {
      fnName = className.substring(ti + 1)
    } else {
      fnName = className
    }
  } else {
    fnName = fn.name
  }

  return fnName.replace(/[^\w]/gi, '_')
}

export function getAllProps(obj, notFunction?: boolean) {
  let props = [];
  do {
    if (obj == Object.prototype || obj == Function.prototype) {
      break;
    }
    props = props.concat(Object.getOwnPropertyNames(obj));
  } while (obj = Object.getPrototypeOf(obj));
  return props.filter(p => {
    if (!notFunction || notFunction && typeof (obj[p]) !== 'function') {
      return p != 'constructor' && !/^__.+/g.test(p)
    }
  });
}

export function getPropertyDescriptor(target, prop) {
  let descr = Object.getOwnPropertyDescriptor(target, prop)
  if (descr === undefined) {
    let proto = target;
    while (descr === undefined && (proto = Object.getPrototypeOf(proto)) != null && proto !== Object.prototype) {
      descr = Object.getOwnPropertyDescriptor(proto, prop)
    }
  }
  return descr;
}


const symbolTag = "[object Symbol]"

function isObjectLike(value) {
  return typeof value == "object" && value !== null
}

export function isSymbol(value) {
  return (
    typeof value === "symbol" ||
    (isObjectLike(value) && Object.prototype.toString.call(value) === symbolTag)
  )
}

export function antiShaking() {
  let queue = []
  let lock
  return {
    push(fn: Function, ...args) {
      if (!queue.find(tk => tk.task === fn)) {
        queue.push({task: fn, args})
      }

      if (!lock) {
        lock = 1

        Promise.resolve().then(() => {
          lock = void 0
          queue.forEach(({task, args}, idx) => {
            task(...args)
            queue[idx] = void 0
          })
          queue = queue.filter(up => up)
        })
      }
    }
  }
}

export function regGlobalObject<T>(name, val: T): T {
  const GLOBAL = window || global

  let rtn: T
  if (GLOBAL) {
    let grxui = GLOBAL['__rxui__']
    if (grxui === void 0) {
      grxui = GLOBAL['__rxui__'] = {}
    }
    if (grxui[name]) {
      rtn = grxui[name]
    } else {
      rtn = grxui[name] = val
    }
  } else {
    rtn = val
  }
  return rtn
}
