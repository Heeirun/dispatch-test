const {
    ChoiceFactory,
    ChoicePrompt,
    ComponentDialog,
    ConfirmPrompt,
    DialogSet,
    DialogTurnStatus,
    NumberPrompt,
    TextPrompt,
    WaterfallDialog
} = require('botbuilder-dialogs');
const { TicketProfile } = require('../ticketProfile');

const NAME_PROMPT = 'NAME_PROMPT'; //NOTE: if there is Authentication then we do not need to prompt for identity
const SUBJECT_PROMPT = 'SUBJECT_PROMPT';
const DESCRIPTION_PROMPT = 'DESCRIPTION_PROMPT';
const PRIORITY_PROMPT = 'PRIORITY_PROMPT';
const PRIMARYAPP_PROMPT = 'PRIMARYAPP_PROMPT';
const SEND_PROMPT = 'SEND_PROMPT';
const TICKET_PROFILE = 'TICKET_PROFILE';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';

class TicketProfileDialog extends ComponentDialog {
    constructor(userState, logger) {
        super('ticketProfileDialog');

        this.ticketProfile = userState.createProperty(TICKET_PROFILE);

        this.logger = logger;

        this.addDialog(new TextPrompt(NAME_PROMPT));
        this.addDialog(new TextPrompt(SUBJECT_PROMPT));
        this.addDialog(new TextPrompt(DESCRIPTION_PROMPT));
        this.addDialog(new TextPrompt(PRIMARYAPP_PROMPT));
        this.addDialog(new TextPrompt(PRIORITY_PROMPT));
        this.addDialog(new TextPrompt(SEND_PROMPT));
        
        

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
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

    async nameStep(step) {
        await step.context.sendActivity("Lets get started on creating your support ticket.");
        return await step.prompt(NAME_PROMPT, "What is your name, human?");
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
        return await step.prompt(PRIMARYAPP_PROMPT, "Can you give me the name of the Primary Application where the isue you are facing is found?");
    }
    async priorityStep(step) {
        step.values.primaryApplication = step.result;
        await step.context.sendActivity(`The details have been recorded on the support ticket`);
        const promptOptions = { prompt: "On a scale of 1 - 5, what is the priority of this particular support ticket?", retryPrompt: 'The value entered must be greater than 0 or less than 6.' };
        return await step.prompt(PRIORITY_PROMPT, promptOptions);
    }

    async showSummaryStep(step) {
        step.values.priority = step.results;
        const ticketProfile = await this.ticketProfile.get(step.context, new TicketProfile());

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
        return await step.prompt(SEND_PROMPT, "Do you wish to submit this support ticket?");
    }

    async summaryStep(step) {
        if (step.result) {
            //CALL: function which send out mail
            await step.context.sendActivity("Your support ticket has been sent and you will be contacted shortly.");
            await step.context.sendActivity("Is there anything else that I can help you with?");
        } else {
            await step.context.sendActivity("Thanks you profile will not be kept");
        }

        return await step.endDialog();
    }

    async agePromptValidator(promptContext) {
        // This condition is our validation rule. You can also change the value at this point.
        return promptContext.recognized.succeeded && promptContext.recognized.value > 0 && promptContext.recognized.value < 6;
    }
}

module.exports.TicketProfileDialog = TicketProfileDialog;