# @mybricks/rxui

> Responsive framework for React programing，like the Mobx but not only Mobx

## Usage

```tsx
import {render, useObservable} from '@mybricks/rxui'

render(<App/>, document.querySelector('#containerDomId'))

function App() {
  const obs = useObservable(class {
    num: number = Math.random()
  })

  return (
    <div>
      {obs.num}
      <button onClick={() => obs.num = Math.random()}>ChangeValue</button>
    </div>
  )
}
```

### API

#### render

```tsx
(
  renderTarget: JSX | { (): JSX },
  parentDom: HTMLElement,
  callback?: Function
) => void
```

```tsx
import {render} from '@mybricks/rxui'
//1.Like reactDom's render
render(<SomCom/>, parentDom, callback)

//2.Factory function
render(comFactory, parentDom, callback)
```