// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler } = require('botbuilder');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');
const { CardFactory } = require('botbuilder');


class DispatchBot extends ActivityHandler {
    /**
     * @param {any} logger object for logging events, defaults to console if none is provided
     */
    constructor(conversationState, userState, ticketDialog, removeWorkDialog, logger) {
        super();
        if (!conversationState) throw new Error('[DialogBot]: Missing parameter. conversationState is required');
        if (!userState) throw new Error('[DialogBot]: Missing parameter. userState is required');
        if (!ticketDialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
        if (!removeWorkDialog) throw new Error('[DialogBot]: Missing parameter. dialog is required');
        if (!logger) {
            logger = console;
            logger.log('[DispatchBot]: logger not passed in, defaulting to console');
        }

        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${ process.env.LuisAPIHostName }.api.cognitive.microsoft.com`
        }, {
            includeAllIntents: true,
            includeInstanceData: true
        }, true);

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAAuthKey,
            host: process.env.QnAEndpointHostName
        });

        this.conversationState = conversationState;
        this.userState = userState;
        this.ticketDialog = ticketDialog;
        this.removeWorkDialog = removeWorkDialog;
        this.logger = logger;
        this.dialogState = this.conversationState.createProperty('DialogState'); // might need an independant one for removeWorkDialog
        this.dispatchRecognizer = dispatchRecognizer;
        this.qnaMaker = qnaMaker;
        this.createTicketCount = 0;
        this.removeWorkCount = 0;

        this.onMessage(async (context, next) => {
            this.logger.log('Processing Message Activity.');
            this.logger.log(context.activity);
            // First, we use the dispatch model to determine which cognitive service (LUIS or QnA) to use.
            const recognizerResult = await dispatchRecognizer.recognize(context);
            // Top intent tell us which cognitive service to use.
            const intent = LuisRecognizer.topIntent(recognizerResult);
            console.log("Intent: " + intent);
            // Next, we call the dispatcher with the top intent.

            if ( intent == "l_CreateTicket" || this.createTicketCount < 8 && this.createTicketCount > 0) {
                logger.log(this.createTicketCount);
                this.createTicketCount++;
                if (this.createTicketCount == 8) {
                    this.createTicketCount = 0;
                }
                await this.ticketDialog.run(context, this.dialogState);
                await next();
            } else if ( intent == "l_RemoveWorkAssignment" || this.removeWorkCount < 6 && this.removeWorkCount > 0){
                logger.log(this.removeWorkCount);
                this.removeWorkCount++;
                if (this.removeWorkCount == 6) {
                    this.removeWorkCount = 0;
                }
                await this.removeWorkDialog.run(context, this.dialogState);
                await next();
            } else {
                logger.log("Create Ticket Count: " + this.createTicketCount);
                logger.log("Remove Work Count: " + this.removeWorkCount);
                this.createTicketCount = 0;
                this.removeWorkCount = 0;
                await this.dispatchToTopIntentAsync(context, intent, recognizerResult);
                // await this.processSampleQnA(context);
                await next();
            }
        });

        this.onMembersAdded(async (context, next) => {
            const welcomeText =`Welcome to the IT Support Bot. Choose from the available actions or type a question to get started.`;
            const membersAdded = context.activity.membersAdded;

            for (let member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    const card = {
                        "type": "AdaptiveCard",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": welcomeText,
                                wrap: true
                            }
                        ],
                        "actions": [{ type: "Action.Submit", title: "Create Support Ticket", data: "Create Support Ticket"}, { type: "Action.Submit", title: "Remove Work Assignment", data: "Remove Work Assignment"}],
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "version": "1.1"
                      }
                      this.logger.log(card);
                      let reply = { attachments: [CardFactory.adaptiveCard(card)] };
                      await context.sendActivity(reply)
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });
    }

    async dispatchToTopIntentAsync(context, intent, recognizerResult) {
        this.logger.log("Enters dispatchToTopIntentAsync");
        switch (intent) {
        case 'l_HomeAutomation':
            await this.processHomeAutomation(context, recognizerResult.luisResult);
            break;
        case 'q_sample-qna':
            await this.processSampleQnA(context);
            break;
        default:
            this.logger.log(`Dispatch unrecognized intent: ${ intent }.`);
            await context.sendActivity(`Dispatch unrecognized intent: ${ intent }.`);
            break;
        }
    }

    async processHomeAutomation(context, luisResult) {
        this.logger.log('processHomeAutomation');

        // Retrieve LUIS result for Process Automation.
        const result = luisResult.connectedServiceResult;
        const intent = result.topScoringIntent.intent;
        await context.sendActivity(`HomeAutomation top intent ${ intent }.`);
        await context.sendActivity(`HomeAutomation intents detected:  ${ luisResult.intents.map((intentObj) => intentObj.intent).join('\n\n') }.`);

        if (luisResult.entities.length > 0) {
            await context.sendActivity(`HomeAutomation entities were found in the message: ${ luisResult.entities.map((entityObj) => entityObj.entity).join('\n\n') }.`);
        }
    }

    async processSampleQnA(context) {
        this.logger.log('processSampleQnA');

        const results = await this.qnaMaker.getAnswers(context);

        if (results.length > 0) {
            const { answer, context: { prompts }} = results[0];

            let reply;
            if (prompts.length) {
      
              const card = {
                "type": "AdaptiveCard",
                "body": [
                    {
                        "type": "TextBlock",
                        "text": answer,
                        wrap: true
                    }
                ],
                "actions": prompts.map(({ displayText }) => ({ type: "Action.Submit", title: displayText, data: displayText })),
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "version": "1.1"
              }
      
              reply = { attachments: [CardFactory.adaptiveCard(card)] };
            } else {
              reply = answer;
            }
            await context.sendActivity(reply);        
        } else {
            await context.sendActivity('Sorry, could not find an answer in the Q and A system.');
        }
    }
}

module.exports.DispatchBot = DispatchBot;
