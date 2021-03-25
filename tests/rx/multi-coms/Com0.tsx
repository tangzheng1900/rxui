import React, {useMemo, useState} from 'react'
import {useComputed, useObservable} from "@mybricks/rxui";

export default function Com0({inputs, data}) {
  inputs['test'](() => {
    data.d0 = 2
    data.d1 = 2
  })

  // const uc = useComputed(()=>{
  //   return tdata.data
  // })

  return (
    <div role={'test'}>
      <i role={'i0'}>{data.d0}</i>
      <i role={'i1'}>{data.d1}</i>
    </div>
  )
}