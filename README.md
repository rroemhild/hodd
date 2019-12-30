# HoDD - Homie Device Discovery

HoDD is a simple client-side (Browser) app to discover [Homie](https://homieiot.github.io) devices. It's a little helper for developing Homie devices or just to spot the amount of Homie devices you are running at home.

Try it online: https://rroemhild.github.io/hodd/

### What's included

* Runs complete in your browser, no server side setup
* Auto discover devices and display them in cards with all attributes, nodes and properties
* Interact with settable properties, no data validation and only rgb support for color
* Clickable clipboard icon to copy topics to clipboard
* Support for Homie 4.0 and 3.0.1 (without arrays)
* Extensions (Homie 4.0)
  * Legacy Firmware (org.homie.legacy-firmware:0.1.1:[4.x])
  * Legacy Stats (org.homie.legacy-stats:0.1.1:[4.x])
  * Microhomie MPy (org.microhomie.mpy:0.1.0:[4.x])


### Installation

* Clone this repository or download the latest release archive
* Open the `index.html` file in your browser
* Make your settings and connect


### Requierements

* MQTT broker with WebSockets


### Screenshot with example data

![HoDD Screenshot](img/hodd.png)
