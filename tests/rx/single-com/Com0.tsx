import React, {useMemo, useState} from 'react'
import {useComputed, useObservable} from "@mybricks/rxui";

export default function Com0() {
  const obsData = useObservable(class {
    data = 0
    other = 0
  })

  // useMemo(()=>{
  //   obsData.data = 5
  // },[])

  //



  // const uc = useComputed(()=>{
  //   return tdata.data
  // })

  return (
    <div role={'test'} onClick={() => {
      obsData.data = 1
      obsData.other = 1
    }}>
      <i role={'i0'}>{obsData.data}</i>
      <i role={'i1'}>{obsData.other}</i>
    </div>
  )
}