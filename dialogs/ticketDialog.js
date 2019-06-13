const {
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { TicketProfile } = require('../ticketProfile');
const nodemailer = require("nodemailer");

const TICKET_PROMPT = 'TICKET_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT'; //NOTE: if there is Authentication then we do not need to prompt for identity
const SUBJECT_PROMPT = 'SUBJECT_PROMPT';
const DESCRIPTION_PROMPT = 'DESCRIPTION_PROMPT';
const PRIORITY_PROMPT = 'PRIORITY_PROMPT';
const PRIMARYAPP_PROMPT = 'PRIMARYAPP_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TICKET_PROFILE = 'TICKET_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class TicketProfileDialog extends ComponentDialog {
    constructor(userState, logger) {
        super('ticketProfileDialog');

        this.ticketProfile = userState.createProperty(TICKET_PROFILE);

        this.logger = logger;
        this.addDialog(new ConfirmPrompt(TICKET_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new TextPrompt(SUBJECT_PROMPT));
        this.addDialog(new TextPrompt(DESCRIPTION_PROMPT));
        this.addDialog(new TextPrompt(PRIMARYAPP_PROMPT));
        this.addDialog(new NumberPrompt(PRIORITY_PROMPT, this.agePromptValidator));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        
        

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.ticketStep.bind(this),
            this.nameStep.bind(this),
            this.subjectStep.bind(this),
            this.descriptionStep.bind(this),
            this.primaryAppStep.bind(this),
            this.priorityStep.bind(this),
            this.showSummaryStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * The run method handles the incoming activity (in the form of a TurnContext) and passes it through the dialog system.
     * If no dialog is active, it will start the default dialog.
     * @param {*} turnContext
     * @param {*} accessor
     */
    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async ticketStep(step) {
        return await step.prompt(TICKET_PROMPT, "Would you like to create a support ticket?");
    }
    async nameStep(step) {
        if (step.result) {
            await step.context.sendActivity("Lets get started on creating your support ticket.");
            return await step.prompt(NAME_PROMPT, "What is your name, human?");
        } else {
            await step.context.sendActivity("Is there anything else that I can help you with?");
            return await step.endDialog();
        }
    }
    async subjectStep(step) {
        step.values.name = step.result;
        await step.context.sendActivity(`Thanks ${step.result}.`);
        return await step.prompt(SUBJECT_PROMPT, "What would the title of your support ticket today be?");
    }
    async descriptionStep(step) {
        step.values.subject = step.result;
        await step.context.sendActivity(`Your support ticket will be titled: ${step.result}`);
        return await step.prompt(DESCRIPTION_PROMPT, "Can you give me a brief description of the problem?");
    }

    async primaryAppStep(step) {
        step.values.description = step.result;
        await step.context.sendActivity(`Your description has been recorded on the support ticket`);
        return await step.prompt(PRIMARYAPP_PROMPT, "Can you give me the name of the Primary Application where the issue you are facing is found?");
    }
    async priorityStep(step) {
        step.values.primaryApplication = step.result;
        await step.context.sendActivity(`The details have been recorded on the support ticket`);
        const promptOptions = { prompt: "On a scale of 1 - 5, what is the priority of this particular support ticket?", retryPrompt: 'The value entered must be greater than 0 or less than 6.' };
        return await step.prompt(PRIORITY_PROMPT, promptOptions);
    }

    async showSummaryStep(step) {
        step.values.priority = step.result;
        const ticketProfile = await this.ticketProfile.get(step.context, new TicketProfile());
        console.log('Enter show summary step');
        ticketProfile.name = step.values.name;
        ticketProfile.subject = step.values.subject;
        ticketProfile.description = step.values.description;
        ticketProfile.primaryApplication = step.values.primaryApplication;
        ticketProfile.priority = step.values.priority;

        let msg = `Your ticket is as follows:\n
        Name: ${ticketProfile.name}\n
        Subject: ${ticketProfile.subject}
        Description: ${ticketProfile.description}\n
        Primary Application: ${ticketProfile.primaryApplication}\n
        Priority: ${ticketProfile.priority}`

        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, "Do you wish to submit this support ticket?");
    }

    async summaryStep(step) {
        this.logger.log(step.result);
        if (step.result) {
            this.sendTicket(step.context, step.values.name, step.values.subject, step.values.description, step.values.primaryApplication, step.values.priority).catch(console.error);
            await step.context.sendActivity("Your support ticket has been sent and you will be contacted shortly.");
            await step.context.sendActivity("Is there anything else that I can help you with?");
        } else {
            await step.context.sendActivity("Thanks you profile will not be kept");
        }

        return await step.endDialog();
    }

    async sendTicket(context, name, title, description, primaryApplication, priority) {
        let transporter = nodemailer.createTransport({
            host: process.env.SMTPHost,
            port: process.env.SMTPPort,
            secure: false,
            auth: {
                user: process.env.SMTPUser,
                pass: process.env.SMTPPass
            }
        });


        let info = await transporter.sendMail({
           from: '"IT Support Chat Bot" <hjayakumar@wisc.edu>',
           to: "jayakumarh@schneider.com, jayakumar@schneider.com",
           subject: 'IT Support Chat Bot',
           html: "<b>Name: " + name + "</br>Priority: " + priority +"</br>Primary Application: " + primaryApplication +"</br>Title: " + title + "</br>Description: " + description + "<b>"
        });

        console.log("Message sent: %s", info.messageId)
    }


    async agePromptValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 6;
    }
}

module.exports.TicketProfileDialog = TicketProfileDialog;