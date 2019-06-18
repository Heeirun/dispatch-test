class RemoveWorkProfile {
    constructor(shipmentNumber, assignmentType, requestName, driverNumber, truckNumber, currentLocation, dateTime, currentFirmware) {
        this.shipmentNumber = shipmentNumber;
        this.assignmentType = assignmentType;
        this.requestName = requestName;
        this.driverNumber = driverNumber;
        this.truckNumber = truckNumber;
        this.currentLocation = currentLocation;
        this.dateTime = dateTime;
        this.currentFirmware = currentFirmware;
    }
}

module.exports.RemoveWorkProfile = RemoveWorkProfile;