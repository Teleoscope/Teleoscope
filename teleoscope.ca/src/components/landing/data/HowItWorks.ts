import { InfoCardProps } from "../InfoCard";
/**
 * HowItWorks is a list of the Teleoscope process. This list is used to generate an InfoCards component.
 */
export const workList: InfoCardProps[] = [
    {
        title: "How It Works",
        subItems: [
            {
                title: "1. Connect Your Data",
                description: "We offer seamless integration with your existing data pipelines so you can spend more time exploring your data and less time parsing it. Simply connect your textual data to Teleoscope to begin your data exploration journey. We support the most common textual data formats including Excel, CSV and JSON. We also offer custom data onboarding for clients working with sensitive data and privacy compliance measures.",
            },
            {
                title: "2. Customize your models",
                description: "Teleoscope runs LLM models in the background to help you refine your data based on examples your domain experts are interested in. We use a drag-and-drop no-code interface to simplify data exploration for the Big Data world."
            },
            {
                title: "3. Extract insights",
                description: "Teleoscope provides traceable, replicable machine learning workflows that helps your organization sort, analyze, and extract value out of your data. No more AI black boxes."
            }
        ],
        graphic: "DiscoverGraphic.svg",
    },
]