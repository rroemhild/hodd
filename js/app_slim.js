/*!
 * HoDD v0.4.0
   Homie Device Discovery
 * (c) 2019 Rafael Römhild
 * Released under the MIT License.
 */

var deviceTopics = {};
var deviceSubscribtions = {};
var colorPicker = VueColor.Compact;

// MQTT client
var BASE_TOPIC = "homie";
var DISCOVERY_TOPIC = `${BASE_TOPIC}/+/$homie`;
var client = new Paho.Client("localhost", 8084, clientId());

// vue
var devices = new Vue({
  el: "#app",
  data: {
    deviceList: {}
  },
  components: { "color-picker": colorPicker },
  methods: {
    updateProperty: function(topic, event) {
      var set_topic = topic + "/set";
      message = new Paho.Message(event);
      message.destinationName = set_topic;
      message.retained = false;
      message.qos = 1;
      client.send(message);
    },
    badge_appearance: function(state) {
      if (state === "init") {
        return "info";
      } else if (state === "ready") {
        return "success";
      } else if (state === "lost") {
        return "warning";
      } else if (state === "disconnected") {
        return "secondary";
      } else if (state === "sleeping") {
        return "primary";
      } else if (state === "alert") {
        return "danger";
      }
    },
    timeSince: function(secs) {
      var t = new Date(1970, 0, 1);
      t.setSeconds(secs);
      var s = t.toTimeString().substr(0, 8);
      if (secs > 86399)
        s = Math.floor((t - Date.parse("1/1/70")) / 3600000) + s.substr(2);
      return s;
    },
    wipeDevice: function(deviceId) {
      // unsubscribe from topics
      for (var i = 0; i < deviceSubscribtions[deviceId].length; i++) {
        client.unsubscribe(deviceSubscribtions[deviceId][i]);
      }
      // remove all retained messages from topics
      for (var i = 0; i < deviceTopics[deviceId].length; i++) {
        message = new Paho.Message("");
        message.destinationName = deviceTopics[deviceId][i];
        message.retained = true;
        client.send(message);
      }

      // remove device from objects
      delete this.deviceList[deviceId];
      delete deviceTopics[deviceId];
      delete deviceSubscribtions[deviceId];

      // update view
      this.$forceUpdate();
    },
    formatToArray: function(csv) {
      // comma seperated value
      var new_array = csv.split(",");
      return new_array;
    },
    stringToRGB: function(v) {
      var rgb = v.split(",");
      return { r: parseInt(rgb[0]), g: parseInt(rgb[1]), b: parseInt(rgb[2]) };
    },
    updateRGBColor: function(t, v) {
      var colorString = v.rgba.r + "," + v.rgba.g + "," + v.rgba.b;
      var set_topic = t + "/set";
      message = new Paho.Message(colorString);
      message.destinationName = set_topic;
      message.retained = false;
      client.send(message);
    },
    doCopy: function(t, v) {
      this.$copyText(t);
    },
    mpyCommand: function(t, v) {
      message = new Paho.Message(v);
      message.destinationName = t + "/$mpy";
      message.retained = false;
      client.send(message);
    },
    showDeviceModal(device) {
      // subscribe to device topics
      subscribe(device.id, `${device.topic}/+`);
      subscribe(device.id, `${device.topic}/$fw/+`);
      subscribe(device.id, `${device.topic}/$stats/+`);

      this.$bvModal.show(device.id);
    }
  }
});

var client_status = new Vue({
  el: "#client_status",
  data: {
    connected: false,
    message: "disconnected",
    broker: "localhost",
    port: 8084,
    ssl: "true",
    user: "",
    pass: "",
    reconnect: true,
    timeout: 10,
    clientId: clientId(),
    topic: BASE_TOPIC,
    autoConnect: "false"
  },
  methods: {
    badge_appearance: function(state) {
      if (this.connected === true) {
        return "success";
      } else {
        return "warning";
      }
    },
    settingsHandleOK(bvModalEvt) {
      BASE_TOPIC = this.topic;
      DISCOVERY_TOPIC = `${this.topic}/+/$homie`;
      connect_to_mqtt(this);
    }
  },
  mounted() {
    if (localStorage.broker) {
      this.broker = localStorage.broker;
    }
    if (localStorage.user) {
      this.user = localStorage.user;
    }
    if (localStorage.pass) {
      this.pass = localStorage.pass;
    }
    if (localStorage.port) {
      this.port = localStorage.port;
    }
    if (localStorage.ssl) {
      this.ssl = localStorage.ssl;
    }
    if (localStorage.topic) {
      this.topic = localStorage.topic;
    }
  },
  watch: {
    broker(newBroker) {
      localStorage.broker = newBroker;
    },
    user(newUser) {
      localStorage.user = newUser;
    },
    pass(newPass) {
      localStorage.pass = newPass;
    },
    port(newPort) {
      localStorage.port = newPort;
    },
    ssl(newSSL) {
      localStorage.ssl = newSSL;
    },
    topic(newTopic) {
      localStorage.topic = newTopic;
    }
  }
});

// Initiate the mqtt client and connect to mqtt
function connect_to_mqtt(settings) {
  // disconnect before re-connect
  if (client.isConnected()) {
    console.log("Disconnect");
    client.disconnect();
  }

  console.log("Connecting...");

  var options = {
    useSSL: settings.ssl === "true",
    onSuccess: onConnect,
    onFailure: doFail,
    reconnect: true,
    timeout: 10
  };

  if (settings.user !== "") {
    options.userName = settings.user;
    if (settings.pass !== "") {
      options.password = settings.pass;
    }
  }

  // new client instance
  client = new Paho.Client(
    settings.broker,
    Number(settings.port),
    settings.clientId
  );

  // set callback handlers
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  client.connect(options);
}

// MQTT Client ID
function clientId() {
  return (
    "hodd_" +
    Math.random()
      .toString(16)
      .substr(2, 8)
  );
}

function doFail(e) {
  console.log(e);
  client_status.connected = false;
  client_status.message = "disconnected";
}

// called when the client connects
function onConnect() {
  client_status.connected = true;
  client_status.message = "connected";
  client.subscribe(DISCOVERY_TOPIC);
}

// called when the client looses its connection
function onConnectionLost(responseObject) {
  if (responseObject.errorCode !== 0) {
    console.log("onConnectionLost:" + responseObject.errorMessage);
  }
  client_status.connected = false;
  client_status.message = "lost";
}

// subscribe to topic and keep that info
function subscribe(deviceId, topic) {
  client.subscribe(topic, 1);
  deviceSubscribtions[deviceId].push(topic);
}

// Unsubscribe from all topics to which we have previously subscribed which start with the given
// prefix.
function unsubscribePrefix(deviceId, topicPrefix) {
  var remainingSubscripions = [];
  for (topic of deviceSubscribtions[deviceId]) {
    if (topic.startsWith(topicPrefix)) {
      client.unsubscribe(topic);
    } else {
      remainingSubscripions.push(topic);
    }
  }
  deviceSubscribtions[deviceId] = remainingSubscripions;
}

// called when a message arrives
function onMessageArrived(message) {
  // console.log("onMessageArrived: " + message.topic + " Payload: " + message.payloadString);

  // ignore /set topics
  if (message.destinationName.endsWith("/set")) {
    return;
  }

  var topic = message.destinationName.slice(BASE_TOPIC.length + 1).split("/");
  var payload = message.payloadString;
  var device_id = topic[0];

  // first message; add device to device list
  if (!(device_id in devices.deviceList)) {
    if (!payload) {
      return;
    }

    // add topic to deviceTopics
    deviceTopics[device_id] = [message.destinationName];
    deviceSubscribtions[device_id] = [];

    devices.$set(devices.deviceList, device_id, {
      id: device_id,
      homie: payload,
      name: "",
      state: "",
      localip: "",
      mac: "",
      fw_name: "",
      fw_version: "",
      stats_interval: "",
      stats_uptime: "",
      stats_freeheap: "",
      implementation: "",
      nodes: {},
      topic: `${BASE_TOPIC}/${topic[0]}`,
      extensions: []
    });

    // subscribe to device topics
    subscribe(device_id, `${BASE_TOPIC}/${topic[0]}/$name`);
    subscribe(device_id, `${BASE_TOPIC}/${topic[0]}/$state`);
  } else {
    // add topic to deviceTopics
    deviceTopics[device_id].push(message.destinationName);

    // process attributes and payloads
    if (topic[1] === "$name") {
      devices.deviceList[device_id]["name"] = payload;
    } else if (topic[1] === "$state") {
      devices.deviceList[device_id]["state"] = payload;
    } else if (topic[1] === "$localip") {
      devices.deviceList[device_id]["localip"] = payload;
    } else if (topic[1] === "$mac") {
      devices.deviceList[device_id]["mac"] = payload;
    } else if (topic[1] === "$implementation") {
      devices.deviceList[device_id]["implementation"] = payload;
    } else if (topic[1] === "$extensions") {
      devices.deviceList[device_id]["extensions"] = payload.split(",");
    } else if (topic[1] === "$fw") {
      if (topic[2] === "name") {
        devices.deviceList[device_id]["fw_name"] = payload;
      } else if (topic[2] === "version") {
        devices.deviceList[device_id]["fw_version"] = payload;
      }
    } else if (topic[1] === "$stats") {
      if (topic[2] === "uptime") {
        devices.deviceList[device_id]["stats_uptime"] = payload;
      } else if (topic[2] === "interval") {
        devices.deviceList[device_id]["stats_interval"] = payload;
      } else if (topic[2] === "freeheap") {
        devices.deviceList[device_id]["stats_freeheap"] = payload;
      }
    } else if (topic[1] === "$nodes") {
      // add nodes to device object
      var nodes = payload.split(",");
      for (n in nodes) {
        // Don't add the node if it's already there, to avoid unnecessary UI updates.
        if (nodes[n] in devices.deviceList[device_id].nodes) {
          continue;
        }
        // devices.$set(devices.deviceList.nodes, node, {});
        devices.$set(devices.deviceList[device_id].nodes, nodes[n], {
          id: nodes[n],
          name: "",
          type: "",
          properties: {}
        });
        subscribe(device_id, `${BASE_TOPIC}/${topic[0]}/${nodes[n]}/$name`);
        subscribe(device_id, `${BASE_TOPIC}/${topic[0]}/${nodes[n]}/$type`);
        subscribe(
          device_id,
          `${BASE_TOPIC}/${topic[0]}/${nodes[n]}/$properties`
        );
      }
      // Remove old nodes from device object.
      for (n in devices.deviceList[device_id].nodes) {
        if (!nodes.includes(n)){
          devices.$delete(devices.deviceList[device_id].nodes, n);
          unsubscribePrefix(device_id, `${BASE_TOPIC}/${topic[0]}/${nodes[n]}/`);
        }
      }
    } else if (topic[1] in devices.deviceList[device_id]["nodes"]) {
      // add attributes to node
      var node = topic[1];

      if (topic[2] === "$name") {
        devices.deviceList[device_id]["nodes"][node]["name"] = payload;
      } else if (topic[2] === "$type") {
        devices.deviceList[device_id]["nodes"][node]["type"] = payload;
      } else if (topic[2] === "$properties") {
        var properties = payload.split(",");
        for (p in properties) {
          devices.$set(
            devices.deviceList[device_id].nodes[node].properties,
            properties[p],
            {
              id: properties[p],
              name: "",
              settable: "false",
              datatype: "string",
              format: "",
              retained: "true",
              unit: "",
              state: "",
              topic: `${BASE_TOPIC}/${topic[0]}/${topic[1]}/${properties[p]}`
            }
          );
          subscribe(
            device_id,
            `${BASE_TOPIC}/${topic[0]}/${topic[1]}/${properties[p]}/#`
          );
        }
      } else if (
        topic[2] in devices.deviceList[device_id]["nodes"][node]["properties"]
      ) {
        property = topic[2];
        if (topic.length === 3) {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "state"
          ] = payload;
        } else if (topic[3] === "$name") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "name"
          ] = payload;
        } else if (topic[3] === "$settable") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "settable"
          ] = payload;
        } else if (topic[3] === "$datatype") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "datatype"
          ] = payload;
        } else if (topic[3] === "$format") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "format"
          ] = payload;
        } else if (topic[3] === "$retained") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "retained"
          ] = payload;
        } else if (topic[3] === "$unit") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "unit"
          ] = payload;
        }
      }
    }
  }
}
