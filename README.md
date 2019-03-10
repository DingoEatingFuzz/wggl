# WGGL

A WebGL wrapper for people who make websites.

Interfacing with WebGL directly is a cumbersome, imperative ordeal fraught with a lot of very specific domain detail. What if the entire problem space could be reinterpreted through the lens of the Modern Web Developer™?

Wggl reimagines WebGL as a state-management problem. Something we're all familiar with at this point.

## Installation

Wggl is an npm package specifically designed for use on the web. It's a bit bumpy at the moment, but
eventually you should be able to use it like any other npm dependency.

Not using npm? Eventually, you will be able to get Wggl from [unpkg](https://unpkg.com/).

## Examples

Wggl has a growing set of examples under [`/examples`](tree/master/examples). Each example is set up the same way, with an `index.html` file and some supporting JavaScript files.

To run any example, use [Parcel](https://parceljs.org/).

```sh
$ cd examples/<example-of-choice>
$ parcel index.html
```

## Core Concepts

Using WebGL is all about taking glsl shader source and eventually creating a WebGL Program that can be executed. The process for creating the program involves creating shaders, binding attributes and uniforms in GPU memory, creating buffers, potentially creating textures, etc., etc.

Typically, going from shader source to running a WebGL program bound to a canvas element is done in an imperative manner: get the shader source, build all the requisite WebGL primitives, bind the program and all requisite primitives, finally draw arrays. Wggl instead considers all of these hoops as state that can be captured as JavaScript objects just like any other state. Then, once ready, a developer can draw with a single function call.

This decouples setting up a WebGL program and executing the program while also creating an opportunity to abstract away some of the boilerplate and procedural details.

## Contributing

The best way to contribute is to try Wggl out and file issues!
