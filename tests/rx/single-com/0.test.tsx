//import 'jest-dom/extend-expect'

import React from 'react';
import {render as testRender, RenderResult, screen, fireEvent} from '@testing-library/react';
import {render} from '@mybricks/rxui'

import Com0 from './Com0'

describe('Single component', () => {
  test('Batch update', () => {
    render.test(testRender, () => <Com0/>)

    const com0 = screen.getByRole('test')
    const i0 = screen.getByRole('i0')
    const i1 = screen.getByRole('i1')

    expect(i0.textContent).toBe('0')
    expect(i1.textContent).toBe('0')

    fireEvent.click(com0)

    expect(i0.textContent).toBe('1')
    expect(i0.textContent).toBe('1')
  })
})
