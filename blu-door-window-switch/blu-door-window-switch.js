// =====================================================
// Shelly BLU Door/Window -> Shelly Switch
//
// BLU Door/Window:
//   OPEN   -> Switch ON
//   CLOSED -> Switch OFF
//
// The state must remain unchanged for the configured
// confirmation time before the action is executed.
//
// The automation only runs during the configured hours.
// =====================================================


// =====================================================
// CONFIGURATION
// =====================================================

let CONFIG = {

    // -------------------------------------------------
    // BTHomeSensor ID of the Door/Window state
    //
    // IMPORTANT:
    // This must be the BTHomeSensor component that
    // corresponds to obj_id 45 (0x2D).
    //
    // Example:
    // bthomesensor:202
    // -------------------------------------------------
    sensorId: 202,


    // -------------------------------------------------
    // Switch output to control
    //
    // 0 = switch:0
    // 1 = switch:1
    // etc.
    // -------------------------------------------------
    switchId: 0,


    // -------------------------------------------------
    // Confirmation time in seconds
    //
    // The BLU state must remain unchanged for this
    // amount of time before the action is executed.
    // -------------------------------------------------
    confirmationSeconds: 5,


    // -------------------------------------------------
    // Active hours
    //
    // The automation only reacts to BLU changes
    // during this period.
    //
    // The period can cross midnight.
    //
    // Example:
    // 17:30 -> 09:00
    // -------------------------------------------------
    activeFrom: "17:30",
    activeUntil: "09:00",


    // -------------------------------------------------
    // Console logging
    //
    // true  = show information in the console
    // false = silent operation
    // -------------------------------------------------
    logging: true
};


// =====================================================
// INTERNAL VARIABLES
// =====================================================

let confirmationTimer = null;
let pendingState = null;


// =====================================================
// LOGGING
// =====================================================

function log(message) {

    if (CONFIG.logging) {
        console.log(message);
    }
}


// =====================================================
// CONVERT HH:MM TO MINUTES
// =====================================================

function timeToMinutes(time) {

    let parts = time.split(":");

    let hours = Number(parts[0]);
    let minutes = Number(parts[1]);

    return (hours * 60) + minutes;
}


// =====================================================
// CHECK ACTIVE HOURS
// =====================================================

function isWithinActiveHours() {

    let now = new Date();

    let currentMinutes =
        (now.getHours() * 60) + now.getMinutes();

    let startMinutes =
        timeToMinutes(CONFIG.activeFrom);

    let endMinutes =
        timeToMinutes(CONFIG.activeUntil);


    // -------------------------------------------------
    // Normal period
    //
    // Example:
    // 09:00 -> 17:30
    // -------------------------------------------------

    if (startMinutes < endMinutes) {

        return (
            currentMinutes >= startMinutes &&
            currentMinutes < endMinutes
        );
    }


    // -------------------------------------------------
    // Period crosses midnight
    //
    // Example:
    // 17:30 -> 09:00
    // -------------------------------------------------

    return (
        currentMinutes >= startMinutes ||
        currentMinutes < endMinutes
    );
}


// =====================================================
// CANCEL CONFIRMATION TIMER
// =====================================================

function cancelConfirmationTimer() {

    if (confirmationTimer !== null) {

        Timer.clear(confirmationTimer);

        confirmationTimer = null;

        log("Confirmation timer cancelled.");
    }
}


// =====================================================
// CONTROL SWITCH OUTPUT
// =====================================================

function setSwitch(desiredState) {

    let switchStatus =
        Shelly.getComponentStatus(
            "switch",
            CONFIG.switchId
        );


    if (!switchStatus) {

        log(
            "ERROR: Could not read switch:" +
            CONFIG.switchId
        );

        return;
    }


    // -------------------------------------------------
    // Avoid unnecessary commands
    // -------------------------------------------------

    if (switchStatus.output === desiredState) {

        log(
            "Switch:" +
            CONFIG.switchId +
            " is already " +
            (desiredState ? "ON" : "OFF") +
            ". No action required."
        );

        return;
    }


    log(
        "Setting switch:" +
        CONFIG.switchId +
        " -> " +
        (desiredState ? "ON" : "OFF")
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
                    CONFIG.switchId +
                    " - " +
                    error_message
                );

                return;
            }


            log(
                "Switch:" +
                CONFIG.switchId +
                " -> " +
                (desiredState ? "ON" : "OFF") +
                " successfully."
            );
        }
    );
}


// =====================================================
// READ CURRENT BLU STATE
// =====================================================

function getSensorState() {

    let status =
        Shelly.getComponentStatus(
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


// =====================================================
// START CONFIRMATION TIMER
// =====================================================

function startConfirmation(state) {

    // -------------------------------------------------
    // Cancel any previous confirmation
    // -------------------------------------------------

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


            // -------------------------------------------------
            // Check active hours again
            // -------------------------------------------------

            if (!isWithinActiveHours()) {

                log(
                    "Confirmation completed outside active hours. " +
                    "Action cancelled."
                );

                return;
            }


            // -------------------------------------------------
            // Read sensor again
            // -------------------------------------------------

            let currentState = getSensorState();


            if (currentState === null) {
                return;
            }


            // -------------------------------------------------
            // Confirm that the state did not change
            // during the confirmation period.
            // -------------------------------------------------

            if (currentState !== pendingState) {

                log(
                    "Gate state changed during confirmation. " +
                    "Action cancelled."
                );

                return;
            }


            // -------------------------------------------------
            // State confirmed
            // -------------------------------------------------

            log(
                "Gate state confirmed: " +
                (currentState ? "OPEN" : "CLOSED")
            );


            // OPEN   -> ON
            // CLOSED -> OFF

            setSwitch(currentState);
        }
    );
}


// =====================================================
// HANDLE BLU STATUS CHANGES
// =====================================================

function handleStatus(status) {

    // -------------------------------------------------
    // Only process our configured BTHomeSensor
    // -------------------------------------------------

    if (
        status.component !==
        "bthomesensor:" + CONFIG.sensorId
    ) {
        return;
    }


    // -------------------------------------------------
    // Only process actual value changes
    // -------------------------------------------------

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


    // -------------------------------------------------
    // Check active hours
    // -------------------------------------------------

    if (!isWithinActiveHours()) {

        cancelConfirmationTimer();

        log(
            "Change ignored - outside active hours."
        );

        return;
    }


    // -------------------------------------------------
    // Start confirmation
    // -------------------------------------------------

    startConfirmation(newState);
}


// =====================================================
// START SCRIPT
// =====================================================

Shelly.addStatusHandler(handleStatus);


log("-----------------------------------------");
log("BLU Door/Window -> Shelly Switch");
log("-----------------------------------------");

log(
    "BTHome sensor: " +
    CONFIG.sensorId
);

log(
    "Switch output: switch:" +
    CONFIG.switchId
);

log(
    "Confirmation: " +
    CONFIG.confirmationSeconds +
    " seconds"
);

log(
    "Active hours: " +
    CONFIG.activeFrom +
    " -> " +
    CONFIG.activeUntil
);

log("-----------------------------------------");
log("Script started - waiting for BLU changes.");
log("-----------------------------------------");
