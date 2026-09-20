// =====================================================
// Shelly BLU Door/Window -> Shelly Switch
// =====================================================

let CONFIG = {
    sensorId: 202,
    switchId: 0,
    confirmationSeconds: 5,
    activeFrom: "17:30",
    activeUntil: "09:00",
    logging: true
};

let confirmationTimer = null;
let pendingState = null;

function log(message) {
    if (CONFIG.logging) {
        console.log(message);
    }
}

function timeToMinutes(time) {
    let parts = time.split(":");
    let hours = Number(parts[0]);
    let minutes = Number(parts[1]);
    return (hours * 60) + minutes;
}

function isWithinActiveHours() {
    let now = new Date();
    let currentMinutes = (now.getHours() * 60) + now.getMinutes();
    let startMinutes = timeToMinutes(CONFIG.activeFrom);
    let endMinutes = timeToMinutes(CONFIG.activeUntil);

    if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes &&
               currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes ||
           currentMinutes < endMinutes;
}

function cancelConfirmationTimer() {
    if (confirmationTimer !== null) {
        Timer.clear(confirmationTimer);
        confirmationTimer = null;
        log("Confirmation timer cancelled.");
    }
}

function setSwitch(desiredState) {
    let switchStatus = Shelly.getComponentStatus(
        "switch",
        CONFIG.switchId
    );

    if (!switchStatus) {
        log("ERROR: Could not read switch:" + CONFIG.switchId);
        return;
    }

    if (switchStatus.output === desiredState) {
        log(
            "Switch:" + CONFIG.switchId +
            " is already " +
            (desiredState ? "ON" : "OFF") +
            ". No action required."
        );
        return;
    }

    log(
        "Setting switch:" + CONFIG.switchId +
        " -> " + (desiredState ? "ON" : "OFF")
    );

    Shelly.call(
        "Switch.Set",
        {
            id: CONFIG.switchId,
            on: desiredState
        },
        function(result, error_code, error_message) {
            if (error_code !== 0) {
                log(
                    "ERROR controlling switch:" +
                    CONFIG.switchId + " - " +
                    error_message
                );
                return;
            }

            log(
                "Switch:" + CONFIG.switchId +
                " -> " + (desiredState ? "ON" : "OFF") +
                " successfully."
            );
        }
    );
}

function getSensorState() {
    let status = Shelly.getComponentStatus(
        "bthomesensor",
        CONFIG.sensorId
    );

    if (!status) {
        log(
            "ERROR: Could not read BTHome sensor:" +
            CONFIG.sensorId
        );
        return null;
    }

    return status.value;
}

function startConfirmation(state) {
    cancelConfirmationTimer();
    pendingState = state;

    log(
        "Gate is " +
        (state ? "OPEN" : "CLOSED") +
        ". Waiting " +
        CONFIG.confirmationSeconds +
        " seconds for confirmation..."
    );

    confirmationTimer = Timer.set(
        CONFIG.confirmationSeconds * 1000,
        false,
        function() {
            confirmationTimer = null;

            if (!isWithinActiveHours()) {
                log(
                    "Confirmation completed outside active hours. " +
                    "Action cancelled."
                );
                return;
            }

            let currentState = getSensorState();

            if (currentState === null) {
                return;
            }

            if (currentState !== pendingState) {
                log(
                    "Gate state changed during confirmation. " +
                    "Action cancelled."
                );
                return;
            }

            log(
                "Gate state confirmed: " +
                (currentState ? "OPEN" : "CLOSED")
            );

            setSwitch(currentState);
        }
    );
}

function handleStatus(status) {
    if (
        status.component !==
        "bthomesensor:" + CONFIG.sensorId
    ) {
        return;
    }

    if (
        !status.delta ||
        status.delta.value === undefined
    ) {
        return;
    }

    let newState = status.delta.value;

    log(
        "BLU Door/Window changed -> " +
        (newState ? "OPEN" : "CLOSED")
    );

    if (!isWithinActiveHours()) {
        cancelConfirmationTimer();
        log("Change ignored - outside active hours.");
        return;
    }

    startConfirmation(newState);
}

Shelly.addStatusHandler(handleStatus);

log("-----------------------------------------");
log("BLU Door/Window -> Shelly Switch");
log("-----------------------------------------");
log("BTHome sensor: " + CONFIG.sensorId);
log("Switch output: switch:" + CONFIG.switchId);
log("Confirmation: " + CONFIG.confirmationSeconds + " seconds");
log("Active hours: " + CONFIG.activeFrom + " -> " + CONFIG.activeUntil);
log("-----------------------------------------");
log("Script started - waiting for BLU changes.");
log("-----------------------------------------");
