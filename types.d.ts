﻿/**
 * RXUI for react UI
 *
 *
 * @author: CheMingjun(chemingjun@126.com)
 */
import React, {FunctionComponent} from 'react';
import {Renderer} from "react-dom";

export * from './src/index'

export type T_NodeInfo = {
  id: string,
  component: FunctionComponent,
  name: string,
  props: {},
  parent: T_NodeInfo,
  invalid?: boolean
  computedUpdaterAry?: T_Updater[]
}

export type T_ComNode = {
  id: string,
  component: FunctionComponent,
  componentName: string,
  parent: T_ComNode | null,
  children: Array<T_ComNode>,
  subjectAry: Array<{ type: Function, proxy: object, direction: T_EmitToObserver }>,
  observerAry: Array<{ type: Function, proxy: object, direction: T_EmitToObserver }>,
  invalid?: boolean
  props?: {}
}

export type T_Updater = {
  fiber: object
  component: React.FunctionComponent
  hoc: Function
  update: Function,
  warcher?: string
}

export type T_EmitToObserver = 'parents' | 'children'

export type T_ObservableCfg<T> = {
  to?: T_EmitToObserver
  expectTo?: T_EmitToObserver
  ignore?: string[]
  init?: (curValue: T) => void
  watch?: (namespace: string, curValue: any, preValue?: any) => void
}

export type T_ObserverCfg = {
  from?: T_EmitToObserver
  // expectTo?: T_EmitToObserver
  // watch?: {
  //   on: string
  //   exe: (prop: string, value: any, preValue?: any) => void
  // }
}

export type T_PipeCfg = {
  from: T_EmitToObserver
  expectTo?: T_EmitToObserver
  // watch?: {
  //   on: string
  //   exe: (prop: string, value: any, preValue?: any) => void
  // }
}

//type Impl<T, P extends keyof T> = (next: (val: { [key in P]: T[key] }) => any) => (T | void)

type Impl<T, P extends keyof T> = (next: (val: { [key in P]: T[key] }) => any) => (T | void)

export function render(...args): Renderer

export function useComputed<T>(fn: () => T): T

export function useObservable<T>(typeClass: (new () => T) | T): T
export function useObservable<T>(typeClass: (new () => T) | T, updater: any[]): T
export function useObservable<T>(typeClass: (new () => T) | T, serailizedId: string): T
export function useObservable<T>(typeClass: (new () => T) | T, serailizedId: string, updater: any[]): T
export function useObservable<T>(typeClass: (new () => T) | T, config: T_ObservableCfg<T>, serailizedId?: string): T
export function useObservable<T>(typeClass: (new () => T) | T, config: T_ObservableCfg<T>, updater?: any[]): T
export function useObservable<T>(typeClass: (new () => T) | T, config: T_ObservableCfg<T>, serailizedId?: string, updater?: any[]): T

export function useObservable<T>(typeClass: (new () => T) | T, implement: Impl<T, {}>, serailizedId?: string): T
export function useObservable<T>(typeClass: (new () => T) | T, implement: Impl<T, {}>, serailizedId?: string, updater?: any[]): T
export function useObservable<T>(typeClass: (new () => T) | T, implement: Impl<T, {}>, config: T_ObservableCfg<T>, serailizedId?: string): T
export function useObservable<T>(typeClass: (new () => T) | T, implement: Impl<T, {}>, updater?: any[]): T
export function useObservable<T>(typeClass: (new () => T) | T, implement: Impl<T, {}>, config: T_ObservableCfg<T>, updater?: any[]): T
export function useObservable<T>(typeClass: (new () => T) | T, implement: Impl<T, {}>, config: T_ObservableCfg<T>, serailizedId?: string, updater?: any[]): T

export function observe<T>(typeClass: new() => T): T
export function observe<T>(typeClass: new() => T, implement: Impl<T, {}>): T
export function observe<T>(typeClass: new() => T, config: T_ObserverCfg): T
export function observe<T>(typeClass: new() => T, implement: Impl<T, {}>, config: T_ObserverCfg): T
export function observe<T>(typeClass: new() => T, implement: Impl<T, {}>, config: T_ObserverCfg, updater: any[]): T

export function useWatcher(target: {},
                           on: string,
                           watcher: (prop: string, value: any, preValue?: any) => void): void

export function from(fromObservable, fromProps?: string[]): { joinTo(toObservable, toProps?: string[]): void }