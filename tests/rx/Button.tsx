import React, {useState} from 'react'
import {useComputed, useObservable} from "@mybricks/rxui";

// export default function Button() {
//   const [t,setT] = useState(3)
//
//   console.log('>>>>',t)
//   return (
//     <button role={'test'} onClick={()=>setT(4)}>{t}</button>
//   )
// }

class TT {
  data = 3
}

export default function Button() {
  const tdata = useObservable(TT)

  const c = useComputed(()=>{
    return tdata.data
  })

  console.log('>>>>', tdata.data)
  return (
    <button role={'test'} onClick={() => {
      tdata.data = 4
    }}>{c}</button>
  )
}