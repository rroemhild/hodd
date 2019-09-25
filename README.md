# HoDD - Homie Device Discovery

HoDD is a simple client-side (Browser) app to discover [Homie](https://homieiot.github.io) devices. It's a little helper for developing Homie devices or just to spot the amount of Homie devices you are running at home.

Currently supports [Homie convention v3.0.1](https://github.com/homieiot/convention/releases/tag/v3.0.1) (without arrays) and Homie v4.0.0 with legacy extensions.


### What's included

* Runs complete in your browser, no server side setup
* Auto discover devices and display them in cards with all the attributes, nodes and properties (read-only)
* Horrible JavaScript and Vue.js source code, written by a SysAdmin learning something new


### In the future

* Some kind of online settings to connect to a different broker quickly
* Clickable node attributes to interact with your device node properties
* More bootstrap-vue, components, vue.js magic, etc.
* Homie 4 support


### Installation

* Clone this repository or download the latest release archive
* Copy `settings.example.js` to `settings.js` and make your changes
* Open the `index.html` file in your browser


### Screenshot with example data

![HoDD Screenshot](img/hodd.png)
