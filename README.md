# Shelly BLU Door/Window -> Shelly Switch

A lightweight Shelly script that connects a **Shelly BLU Door/Window sensor** to a **Shelly switch output**.

It is designed for situations where a BLU Door/Window sensor should control a light, LED strip, relay, or another Shelly switch while avoiding unwanted triggers caused by short-lived state changes.

## Features

- **BLU Door/Window OPEN -> Switch ON**
- **BLU Door/Window CLOSED -> Switch OFF**
- Configurable confirmation delay before changing the output
- Cancels the pending action if the BLU state changes again
- Configurable active hours
- Supports active periods that cross midnight
- Does not synchronize the output when the script starts
- Avoids unnecessary switch commands when the output is already in the requested state
- Configurable BTHome sensor ID and switch ID
- Optional console logging

## Project Structure

```text
shelly-blu-door-window-switch/
|
├── README.md
|
└── blu-door-window-switch/
    ├── blu-door-window-switch.js
    └── README.md
```

## How It Works

The script listens for **BTHome status changes** from the configured BLU Door/Window sensor.

When a change is detected:

1. The script checks whether the current time is inside the configured active period.
2. A confirmation timer is started.
3. If the BLU state changes again before the timer expires, the pending action is cancelled.
4. When the timer expires, the script reads the BLU state again.
5. If the state is still unchanged, the corresponding switch command is executed.

Example:

```text
BLU OPEN
   |
   +-- wait 5 seconds
   |
   +-- still OPEN? -- YES --> Switch ON
   |
   +-- changed? ------------> Cancel
```

The same logic is used for the CLOSED state.

## Important: BTHome Sensor ID

A Shelly BLU Door/Window sensor exposes several BTHome objects through the Shelly device.

The script needs the **BTHomeSensor component ID associated with the Door/Window state**, not the battery component.

For a BLU Door/Window state, the relevant BTHome object is:

```text
obj_id: 45 (0x2D)
```

The component ID can be different on different Shelly devices.

For example, on the device used during development:

```text
bthomesensor:202 -> obj_id 45 -> Door/Window state
```

Check your device with `Shelly.GetComponents({dynamic_only:true})` if you are unsure which component ID to use.

## Requirements

- A Shelly device with scripting support
- A Shelly BLU Door/Window sensor
- The BLU sensor must be within Bluetooth range of the Shelly running the script
- A controllable Shelly switch output

The script was tested with:

- **Shelly 1PM Gen4**
- **Shelly BLU Door/Window**
- Shelly firmware **2.0.0**

Other Shelly devices may work as long as they provide the required scripting, BTHome and switch APIs.

## Installation

1. Open the Shelly web interface.
2. Go to **Scripts**.
3. Create a new script.
4. Copy the contents of `blu-door-window-switch/blu-door-window-switch.js`.
5. Save the script.
6. Configure the values in the **CONFIGURATION** section.
7. Start the script.

## Configuration

The configuration is located at the top of the script:

```javascript
let CONFIG = {
    sensorId: 202,
    switchId: 0,
    confirmationSeconds: 5,
    activeFrom: "17:30",
    activeUntil: "09:00",
    logging: true
};
```

### sensorId

The BTHomeSensor component ID corresponding to the BLU Door/Window state.

### switchId

The Shelly switch output to control.

### confirmationSeconds

How long the BLU state must remain unchanged before the output is controlled.

### activeFrom / activeUntil

Defines when the automation is allowed to react. Periods crossing midnight are supported.

## Startup Behavior

The script intentionally **does not synchronize the switch with the current BLU state when it starts**.

After startup, it waits for the next actual BLU Door/Window state change.

This prevents an unexpected switch activation immediately after a script restart or Shelly reboot.

## Console Logging

Set `logging: true` to see useful information in the Shelly script console.

Set `logging: false` for silent operation.

## Troubleshooting

### The script does not react to the BLU sensor

Check that `sensorId` points to the BTHomeSensor component representing the Door/Window state.

Do not use the battery component ID.

Use:

```text
Shelly.GetComponents({dynamic_only:true})
```

and look for the component whose BTHome object is:

```text
obj_id: 45
```

### The switch does not change

Check `switchId`, confirm that the output is controllable, and check the Shelly script console for errors.

### Nothing happens during the day

Check `activeFrom` and `activeUntil`.

Example:

```text
17:30 -> 09:00
```

## License

This project is provided as-is for personal and educational use.
