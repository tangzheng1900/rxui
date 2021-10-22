import {observe, implement,useObservable,useComputed} from "@mybricks/rxui";
import {useEffect} from "react";

class CTX {
  columns:number[] = []
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
  const ctx = useObservable(CTX,{expectTo: 'children'})

  useEffect(()=>{
    //ctx.columns.push(3)
    setTimeout(v=>{
      console.log(Math.random())
      const cc = ctx.columns

      //debugger
      cc.push(Math.random())
    },1000)
  },[])

  const columns = useComputed(() => {
    ctx.columns&&ctx.columns.forEach(col=>{
      console.log('columns', ctx.columns)
    })

    return ctx.columns
  })

  return (
    <div>
      <Com columns={columns}/>
    </div>
  )
}

function Com({columns}){
  return (
    <div>
      {columns.map(col=>col)}
    </div>
  )
}