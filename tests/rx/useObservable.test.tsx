//import 'jest-dom/extend-expect'

import React from 'react';
import {render as testRender, RenderResult, screen, fireEvent} from '@testing-library/react';
import {render} from '@mybricks/rxui'

import Button from './Button'

describe('test', () => {
  test('Button', () => {
    render.test(testRender, <App/>)

    const testBtn = screen.getByRole('test')

    expect(testBtn.textContent).toBe('3')
    fireEvent.click(testBtn)
    expect(testBtn.textContent).toBe('4')
  })
})

function App() {
  return <div>
    <Button/>
  </div>
}

