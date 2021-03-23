import {FROMCLASS, HASHCODE, KEY_REF, loadTodo, stored, TEMP_MERGEDATA} from "./state-common";
import {SerializedReg} from "./decorators";
import {getAllProps, getPropertyDescriptor} from "../util";
import {META_IGNORE} from "../constants";
import {Responsive} from "../rx/responsive";
import {clone} from "./clone";

const TEMP_CONSTS_IN_REFS = '__consts__'

/**
 * Load states
 * @param data serialized data
 */
export function load(data: { [viewName: string]: { def, refs, consts } },
                     notMerge?: boolean): { [id: string]: {} } {
  if (typeof data !== 'object') {
    throw new Error(`Invalid data format.`)
  }

   //console.time('----')
   data = JSON.parse(JSON.stringify(data))
  //data = clone(data)
   //console.timeEnd('----')

  const {refs, defs} = {refs: {}, defs: {}}
  for (let viewName in data) {
    const now = data[viewName]
    if (typeof now !== 'object' || typeof now['def'] !== 'object' || typeof now['refs'] !== 'object') {
      throw new Error(`Invalid data format.`)
    }
    const {def, refs: nowRefs, consts} = now
    defs[viewName] = def

    if (nowRefs) {
      for (const nm in nowRefs) {
        nowRefs[nm][TEMP_CONSTS_IN_REFS] = consts
      }
    }

    Object.assign(refs, nowRefs)
  }
//debugger
  Object.keys(refs).forEach(id => {//Replace to real instances
    // if(id==='ComStyle_92w5'){
    //   debugger
    // }
    let obj = refs[id], seriName;
    if ((seriName = obj[FROMCLASS]) !== void 0) {
      seriName = obj[TEMP_CONSTS_IN_REFS].froms[seriName]

      delete obj[TEMP_CONSTS_IN_REFS]

      const reg = SerializedReg[seriName]
      if (!reg) {
        return
      }
      if (reg && reg.proto) {
        const rst = newInstance(reg.proto)

        rst[FROMCLASS] = seriName;

        rst[TEMP_MERGEDATA] = obj;//Cache in private var

        refs[id] = rst
      } else {
        throw new Error(`Invalid data format.`)
      }
    }
  })

  const didMap = {};
  const seContext = {refs, didMap}

  function merge(serial, cur) {
    const now = deserialize(seContext, serial, cur)

    if (cur) {
      Object.keys(now).forEach(nm => {
        let val = now[nm]
        // if (val) {
        //   val = deserialize(seContext, val)
        //   let mmetas = val[MetaIgnore]
        //   if (!mmetas || !mmetas[nm]) {
        //     if (val && typeof val === 'object' && !Array.isArray(val)) {
        //       Object.keys(val).forEach(vnm => {
        //         if (!mmetas || !mmetas[vnm]) {
        //           cur[nm] && (cur[nm][vnm] = val[vnm])
        //         }
        //       })
        //     } else {
        //       cur[nm] = val
        //     }
        //   }
        // } else {
        cur[nm] = val
        //}
      })
      return cur
    } else {
      return now
    }
  }

  //merge
  const batch = Responsive.applyBatch()

  const rtn = {}

  Object.keys(defs).forEach(sid => {
    const serial = defs[sid]

    if (notMerge) {
      rtn[sid] = deserialize(seContext, serial)
    } else {
      const cur = stored[sid]
      if (cur !== void 0) {
        rtn[sid] = merge(serial, cur)//Merge value to cur prop
      } else {
        loadTodo[sid] = ori => {
          const batch = Responsive.applyBatch()
          rtn[sid] = merge(serial, ori)
          batch.cancel()
        }
      }
    }
  })

  batch.commit()

  return rtn
}

function deserialize({refs, didMap}, serial, ref?) {
  if (Array.isArray(serial)) {
    return serial.map(to => deserialize({refs, didMap}, to))
  }
  if (typeof (serial) == 'object' && serial) {
    if (serial[HASHCODE]) {//Some exist components
      didMap[serial[HASHCODE]] = ref ? ref : serial;
      return ref || serial
    }
    const refKey = serial[KEY_REF]
    if (typeof (refKey) == 'string') {//Ref to an object
      // if (refKey.match(/DiagramModel_.*/gi)) {
      //   console.log(SerializedReg)
      //   debugger
      // }

      if (!ref && didMap[refKey]) {
        return didMap[refKey];
      }
      serial = refs[refKey]
      didMap[refKey] = ref ? ref : serial;
    }

    let serialReg, seriName;
    if (seriName = serial[FROMCLASS]) {
      delete serial[FROMCLASS]
      serialReg = SerializedReg[seriName]
      if (!serialReg) {
        return
      }
      if (!serialReg || !serialReg.proto) {
        throw new Error(`Invalid data format.`)
        //console.log(SerializedReg)
        //throw new Error(`'Serializable class for name "${seriName}" not found.'`);
      }
    }

    let serialData = serial[TEMP_MERGEDATA]

    if (serialData === void 0 && serialReg) {
      serialData = serial
      serial = newInstance(serialReg.proto)
    }
    if (serialData) {
      delete serial[TEMP_MERGEDATA];

      let props = getAllProps(serialData)
      if (props.length > 0) {
        const metaIgnore = serialData[META_IGNORE]
        props.forEach(prop => {

          // if(prop==='diagramAry'){
          //   debugger
          // }

          if (prop === META_IGNORE) {
            return;
          }
          const descr = getPropertyDescriptor(serial, prop);
          if (descr && (descr.get && !descr.set) || (metaIgnore && metaIgnore[prop])) {//Ignore getter(no setter) in target
            return
          }

          if (!metaIgnore || !metaIgnore[prop]) {
            const tval = deserialize({refs, didMap}, serialData[prop]);
            try {
              let loadFn;
              if (serialReg && typeof ((loadFn = serialReg.load)) == 'function') {
                let tv = loadFn(serial, prop, tval);
                if (tv !== undefined) {
                  serial[prop] = tv
                } else {
                  //delete obj[prop]//ignore undefined value
                }
              } else {
                serial[prop] = tval
              }
            } catch (ex) {
              throw ex;
              //Ignore the error
              const pdesc = Object.getOwnPropertyDescriptor(serial, prop);
              if (pdesc) {
                //debugger;
              }
            }
          }
        })
      }
    } else {
      let props = getAllProps(serial)

      if (props.length > 0) {
        const metaIgnore = serial[META_IGNORE]

        props.forEach(prop => {
          if (prop === META_IGNORE) {
            return;
          }
          const descr = getPropertyDescriptor(serial, prop);
          if (descr && (descr.get && !descr.set) || (metaIgnore && metaIgnore[prop])) {//Ignore getter(no setter) in target
            return
          }

          if (!metaIgnore || !metaIgnore[prop]) {
            if (metaIgnore) {
              debugger
              console.log(prop)
            }

            const tval = deserialize({refs, didMap}, serial[prop]);
            try {
              let loadFn;

              const descr = getPropertyDescriptor(serial, prop);
              if (descr && (descr.get && !descr.set)) {//Ignore getter(no setter) in target
                return
              }

              if (serialReg && typeof ((loadFn = serialReg.load)) == 'function') {
                let tv = loadFn(serial, prop, tval);
                if (tv !== undefined) {
                  serial[prop] = tv
                } else {
                  //delete obj[prop]//ignore undefined value
                }
              } else {
                serial[prop] = tval
              }
            } catch (ex) {
              debugger
              throw ex;
            }
          }
        })
      }
    }
  }
  return serial;
}

function getTempMetaData(obj) {

}

function newInstance(proto: Function) {
  const rst = new proto();

  // const rst = new Object()
  // Object.setPrototypeOf(rst, proto.prototype)

  return rst
}
