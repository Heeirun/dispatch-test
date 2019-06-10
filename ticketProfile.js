class TicketProfile {
    constructor(name, subject, description, primaryApplication, priority) {
        this.name = name;
        this.subject = subject;
        this.description = description;
        this.primaryApplication = primaryApplication;
        this.priority = priority;
        
    }
}

module.exports.TicketProfile = TicketProfile;