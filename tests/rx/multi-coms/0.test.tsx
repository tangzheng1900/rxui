import {observable, render, igonreObservableBefore} from "@mybricks/rxui";
import {act, fireEvent, render as testRender, screen, waitFor} from "@testing-library/react";
import Com0 from "./Com0";
import React from "react";

//jest.setTimeout(30000)

//jest.useFakeTimers();

test(`Property's changed`, async (done) => {
  const data = observable(class {
    d0 = 1
    d1 = 1
  })

  jest.useFakeTimers()

  let did = false

  function test(fn) {
    if (!did) {
      did = true

      setTimeout(async () => {
        await act(async () => {
          //igonreObservableBefore()
          fn()
        })

        const i0 = screen.getByRole('i0')
        const i1 = screen.getByRole('i1')

        expect(i0.textContent).toBe('2')
        expect(i1.textContent).toBe('2')

        done()
      })
    }
  }

  render.test(testRender, function Root() {
    return (<div role={'testDiv'}><Com0
        data={data}
        inputs={{
          test
        }}
      /></div>
    )
  })

  jest.runAllTimers()
})