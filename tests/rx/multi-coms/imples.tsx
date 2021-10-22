import {observe, implement,useObservable} from "@mybricks/rxui";
import {useEffect} from "react";

class CTX {
  // m0() {
  //   return 'ori'
  // }
}

export default function App() {
  return (
    <div>
      Test RXUI:
      <Designer/>
    </div>
  )
}

function Designer() {
  const tt = useObservable(CTX,{expectTo: 'children'})

  implement(CTX,next=>next(
    {
      m0() {
        return 'C0'
      }
    }
  ), {from: 'children', expectTo: 'children'})

  useEffect(()=>{
    console.log(tt.m0())
  })

  return (
    <div>
      <GeoView/>
    </div>
  )
}

class C00Ctx{
  ctx:CTX
}

function GeoView() {
  implement(CTX,next=>next(
    {
      m0() {
        return 'C01'
      }
    }
  ), {from: 'parents'})

  return (
    <div>
      <GeoCom/>
    </div>
  )
}


function GeoCom(){
  const ctx =  useObservable(CTX,{expectTo: 'parents'})

  useObservable(C00Ctx,next=>next({
    ctx
  }),{to:'children'})


  return (
    <div>
      <Normal/>
    </div>
  )
}


function Normal(){
  const {ctx} = observe(C00Ctx,{from: 'parents'})

  useEffect(()=>{
    const tt = ctx.m0()
    console.log(tt)
  },[])

  return (
    <div>aaa:
      {/*{tt}*/}
    </div>
  )
}