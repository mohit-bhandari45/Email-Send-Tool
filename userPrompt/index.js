import { select } from "@inquirer/prompts";
import promptApplication from "./application.js";
import promptOpportunity from "./opportunity.js";

async function promptUser() {
    const emailType = await select({
        message: "Email type:",
        choices: [
            { name: "Application", value: "application" },
            { name: "Opportunity", value: "opportunity" },
        ],
    });

    if (emailType === "application") {
        return promptApplication();
    }

    return promptOpportunity();
}

export default promptUser;