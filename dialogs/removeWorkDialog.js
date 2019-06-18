const {
    ChoiceFactory,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    ChoicePrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { RemoveWorkProfile } = require('../removeWorkProfile');
const nodemailer = require("nodemailer");

const REMOVE_PROMPT = 'REMOVE_PROMPT';
const NAME_PROMPT = 'NAME_PROMPT'
const SHIPMENT_NUMBER_PROMPT ='SHIPMENT_NUMBER_PROMPT';
const ASSIGNMENT_TYPE_PROMPT = 'ASSIGNMENT_TYPE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const REMOVEWORK_PROFILE = 'REMOVEWORK_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class RemoveWorkDialog extends ComponentDialog {
    constructor(userState, logger) {
        super('removeWorkDialog');

        this.removeWorkProfile = userState.createProperty(REMOVEWORK_PROFILE);

        this.logger = logger;
        this.addDialog(new ConfirmPrompt(REMOVE_PROMPT));
        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new TextPrompt(SHIPMENT_NUMBER_PROMPT));
        this.addDialog(new ChoicePrompt(ASSIGNMENT_TYPE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        
        

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.removeWorkStep.bind(this),
            this.nameStep.bind(this),
            this.shipmentNumStep.bind(this),
            this.subjectStep.bind(this),
            this.showSummaryStep.bind(this),
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async removeWorkStep(step) {
        return await step.prompt(REMOVE_PROMPT, "Would you like to remove a work assignment?");
    }

    async nameStep(step) {
        if (step.result) {
            await step.context.sendActivity("Lets get started on removing your work assignment.");
            return await step.prompt(NAME_PROMPT, "What is your name?");
        } else {
            await step.context.sendActivity("Is there anything else that I can help you with?");
            return await step.endDialog();
        }
    }
    async shipmentNumStep(step) {
        step.values.name = step.result;
        await step.context.sendActivity(`Thanks ${step.result}.`);
        return await step.prompt(SHIPMENT_NUMBER_PROMPT, "What is your shipment number?");
    }

    async subjectStep(step) {
        step.values.shipmentNumber = step.result;
        await step.context.sendActivity(`Your shipment number is: ${step.result}.`);
        return await step.prompt(ASSIGNMENT_TYPE_PROMPT, {
            prompt: "What assignment type is this work assignment?",
            choices: ChoiceFactory.toChoices(['Active assignment', 'Current Assignment'])
        });
    }

    async showSummaryStep(step) {
        step.values.assignmentType = step.result.value;
        const removeWorkProfile = await this.removeWorkProfile.get(step.context, new RemoveWorkProfile());
        console.log('Enter show summary step');
        removeWorkProfile.requestName = step.values.name;
        removeWorkProfile.shipmentNumber = step.values.shipmentNumber;
        removeWorkProfile.assignmentType = step.values.assignmentType;

        let msg = `Your ticket is as follows:\n
        Name: ${removeWorkProfile.requestName}\n
        Shipment Number: ${removeWorkProfile.shipmentNumber}\n
        Assignment Type: ${removeWorkProfile.assignmentType}`;

        await step.context.sendActivity(msg);
        return await step.prompt(CONFIRM_PROMPT, "Do you wish to submit this request?");
    }

    async summaryStep(step) {
        this.logger.log("SUMSTEP" + step.result);
        if (step.result) {
            this.sendTicket(step.values.name, step.values.shipmentNumber, step.values.assignmentType).catch(console.error);
            await step.context.sendActivity("Your request has been sent and you will be contacted shortly.");
            await step.context.sendActivity("Is there anything else that I can help you with?");
        } else {
            await step.context.sendActivity("You request has been canceled.");
            await step.context.sendActivity("Is there anything else that I can help you with?");
        }
        return await step.endDialog();
    }

    async sendTicket(name, shipmentNumber, assignmentType) {
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
           html: "<b>Name: " + name + "</br>Shipment Number: " + shipmentNumber + "</br>Assignment Type: " + assignmentType + "<b>"
        });

        console.log("Message sent: %s", info.messageId)
    }
}

module.exports.RemoveWorkDialog = RemoveWorkDialog;