class RemoveWorkProfile {
    constructor(shipmentNumber, assignmentType, driverNumber, truckNumber, currentLocation, dateTime, currentFirmware) {
        this.shipmentNumber = shipmentNumber;
        this.assignmentType = assignmentType
        this.driverNumber = driverNumber;
        this.truckNumber = truckNumber;
        this.currentLocation = currentLocation;
        this.dateTime = dateTime;
        this.currentFirmware = currentFirmware;
    }
}

module.exports.RemoveWorkProfile = RemoveWorkProfile;