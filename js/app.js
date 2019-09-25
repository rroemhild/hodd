/*!
 * HoDD v0.1.0
   Homie Device Discovery
 * (c) 2019 Rafael Römhild
 * Released under the MIT License.
 */

// vue
var devices = new Vue({
  el: "#device",
  data: {
    deviceList: {}
  },
  methods: {
    toggle: function(topic, event) {
      var set_topic = topic + "/set";
      message = new Paho.Message(event);
      message.destinationName = set_topic;
      message.retained = false;
      client.send(message);
    },
    badge_appearance: function(state) {
      if (state === "init") {
        return "badge-info";
      } else if (state === "ready") {
        return "badge-success";
      } else if (state === "lost") {
        return "badge-warning";
      } else if (state === "dicsonnected") {
        return "badge-secondary";
      } else if (state === "sleeping") {
        return "badge-primary";
      } else if (state === "alert") {
        return "badge-danger";
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
    changeObjectItem: function() {
      this.$set(this.updated, true);
    }
  }
});

var client_status = new Vue({
  el: "#client_status",
  data: {
    connected: false,
    message: "dicsonnected"
  },
  methods: {
    badge_appearance: function(state) {
      if (this.connected === true) {
        return "badge-success";
      } else {
        return "badge-warning";
      }
    }
  }
});

// MQTT Client
var clientId =
  "hodd_" +
  Math.random()
    .toString(16)
    .substr(2, 8);
client = new Paho.Client(MQTT_BROKER, Number(MQTT_PORT), clientId);

// set callback handlers
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;
var options = {
  useSSL: MQTT_USE_SSL,
  userName: MQTT_USER,
  password: MQTT_PASS,
  onSuccess: onConnect,
  onFailure: doFail,
  reconnect: true,
  timeout: 10
};

// connect the client
client.connect(options);

function doFail(e) {
  console.log(e);
  client_status.connected = false;
  client_status.message = "dicsonnected";
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

// called when a message arrives
function onMessageArrived(message) {
  // console.log("onMessageArrived: " + message.topic + " Payload: " + message.payloadString);

  var topic = message.destinationName.split("/");
  var payload = message.payloadString;
  var device_id = topic[1];

  // first message; add device to device list
  if (!(device_id in devices.deviceList)) {
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
      nodes: {}
    });

    // subscribe to device topics
    client.subscribe(topic[0] + "/" + topic[1] + "/+");
    client.subscribe(topic[0] + "/" + topic[1] + "/$fw/+");
    client.subscribe(topic[0] + "/" + topic[1] + "/$stats/+");
  } else {
    // process attributes and payloads
    if (topic[2] === "$name") {
      devices.deviceList[device_id]["name"] = payload;
    } else if (topic[2] === "$state") {
      devices.deviceList[device_id]["state"] = payload;
    } else if (topic[2] === "$localip") {
      devices.deviceList[device_id]["localip"] = payload;
    } else if (topic[2] === "$mac") {
      devices.deviceList[device_id]["mac"] = payload;
    } else if (topic[2] === "$implementation") {
      devices.deviceList[device_id]["implementation"] = payload;
    } else if (topic[2] === "$fw") {
      if (topic[3] === "name") {
        devices.deviceList[device_id]["fw_name"] = payload;
      } else if (topic[3] === "version") {
        devices.deviceList[device_id]["fw_version"] = payload;
      }
    } else if (topic[2] === "$stats") {
      if (topic[3] === "uptime") {
        devices.deviceList[device_id]["stats_uptime"] = payload;
      } else if (topic[3] === "interval") {
        devices.deviceList[device_id]["stats_interval"] = payload;
      } else if (topic[3] === "freeheap") {
        devices.deviceList[device_id]["stats_freeheap"] = payload;
      }
    } else if (topic[2] === "$nodes") {
      // add nodes to device object
      var nodes = payload.split(",");
      for (n in nodes) {
        // devices.$set(devices.deviceList.nodes, node, {});
        devices.$set(devices.deviceList[device_id].nodes, nodes[n], {
          id: nodes[n],
          name: "",
          type: "",
          properties: {}
        });
        client.subscribe(topic[0] + "/" + topic[1] + "/" + nodes[n] + "/$name");
        client.subscribe(topic[0] + "/" + topic[1] + "/" + nodes[n] + "/$type");
        client.subscribe(
          topic[0] + "/" + topic[1] + "/" + nodes[n] + "/$properties"
        );
      }
    } else if (topic[2] in devices.deviceList[device_id]["nodes"]) {
      // add attributes to node
      var node = topic[2];

      if (topic[3] === "$name") {
        devices.deviceList[device_id]["nodes"][node]["name"] = payload;
      } else if (topic[3] === "$type") {
        devices.deviceList[device_id]["nodes"][node]["type"] = payload;
      } else if (topic[3] === "$properties") {
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
              topic: ""
            }
          );
          client.subscribe(
            topic[0] + "/" + topic[1] + "/" + topic[2] + "/" + properties[p]
          );
          client.subscribe(
            topic[0] +
              "/" +
              topic[1] +
              "/" +
              topic[2] +
              "/" +
              properties[p] +
              "/+"
          );
        }
      } else if (
        topic[3] in devices.deviceList[device_id]["nodes"][node]["properties"]
      ) {
        property = topic[3];
        if (topic.length === 4) {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "state"
          ] = payload;
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "topic"
          ] = message.destinationName;
        } else if (topic[4] === "$name") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "name"
          ] = payload;
        } else if (topic[4] === "$settable") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "settable"
          ] = payload;
        } else if (topic[4] === "$datatype") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "datatype"
          ] = payload;
        } else if (topic[4] === "$format") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "format"
          ] = payload;
        } else if (topic[4] === "$retained") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "retained"
          ] = payload;
        } else if (topic[4] === "$unit") {
          devices.deviceList[device_id]["nodes"][node]["properties"][property][
            "unit"
          ] = payload;
        }
      }
    }
  }
}
