# BLU Door/Window -> Shelly Switch

This folder contains the standalone Shelly script for connecting a **Shelly BLU Door/Window sensor** to a **Shelly switch output**.

## Requirements

- Shelly device with scripting support
- Shelly BLU Door/Window sensor
- BLU sensor within Bluetooth range
- Shelly switch output to control

Tested with a **Shelly 1PM Gen4** running Shelly firmware **2.0.0**.

## Installation

1. Open the Shelly web interface.
2. Open **Scripts**.
3. Create a new script.
4. Copy `blu-door-window-switch.js` into the script editor.
5. Adjust the configuration at the top of the script.
6. Save and start the script.

## Configuration

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

The BTHomeSensor component representing the **Door/Window state**.

For the BLU Door/Window, the relevant BTHome object is:

```text
obj_id 45 (0x2D)
```

The component ID itself may differ between installations.

For example:

```text
bthomesensor:202
```

If you need to identify it, use:

```javascript
Shelly.GetComponents({dynamic_only:true})
```

and find the BTHome component associated with `obj_id: 45`.

### switchId

The switch output to control.

For a single-output device:

```javascript
switchId: 0
```

### confirmationSeconds

The number of seconds the BLU state must remain unchanged before the output is controlled.

### Active Hours

The automation only reacts during the configured period.

```javascript
activeFrom: "17:30",
activeUntil: "09:00"
```

Periods crossing midnight are supported.

## Behavior

### BLU opens

```text
OPEN
  |
Wait confirmationSeconds
  |
Still OPEN?
  +-- YES -> Switch ON
  +-- NO  -> Cancel
```

### BLU closes

```text
CLOSED
   |
Wait confirmationSeconds
   |
Still CLOSED?
  +-- YES -> Switch OFF
  +-- NO  -> Cancel
```

### Outside active hours

BLU changes are ignored.

Any pending confirmation is also cancelled if a new BLU change is received outside the active period.

## Startup Behavior

The script does **not** read the current BLU state and synchronize the switch when it starts.

It waits for the next BLU state change.

This is intentional and avoids unexpected output changes after a restart.

## Notes

The script listens specifically for:

```text
bthomesensor:<sensorId>
```

status changes and only reacts when the BTHome `value` actually changes.

The switch output is checked before sending `Switch.Set`, so unnecessary commands are avoided.
