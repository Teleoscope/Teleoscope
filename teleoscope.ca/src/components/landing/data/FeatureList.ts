import { InfoCardProps } from "../InfoCard";
/**
 * FeatureList is a list of features Teleoscope's landing page highlights. This list is used to generate the InfoCards component.
 */
export const featureList: InfoCardProps[] = [
    {
        title: "Discover Hidden Insights",
        subItems: [
            {
                title: "Semantic similarity",
                description: "Keyword searches are based on textual similarities between words, making them ineffective for documents with semantically complicated insights.",
            },
            {
                title: "Traceable workflows",
                description: "Understanding the origins of your conclusions and being able to cite them is a key part of research. Telescope's traceable workflows display exactly which data entries influenced the insights it generated, providing researchers a clear understanding of each result's provenance.",
            },
        ],
        graphic: "DiscoverGraphic.svg",
    },
    {
        title: "Analyze and Visualize Through the Noise",
        subItems: [
            {
                title: "Powerful Unique AI",
                description: "Telescope is designed to be used by researchers and analysts working on all kinds of research projects. Telescope allows you to customize its machine learning model to work best for you and your team. Using its dynamic workflows, you can quickly tailor its AI model to match and filter through your data.",
            },
            {
                title: "Organize and Filter",
                description: "Telescope's state of the art drag-and-drop interface enables seamless data navigation outside the confines of traditional rows and columns. Our streamlined user experience empowers analysts to delve into their data with ease, allowing analysts to focus on data exploration over data parsing.",
            },
        ],
        graphic: "DiscoverGraphic.svg",
    },
    {
        title: "Collaboration and Sharing",
        subItems: [
            {
                title: "Multi-User Collaboration",
                description: "Telescope is designed to be used by teams of researchers and analysts. Telescope allows you to share your data and analyses with your team members, enabling you to work together on your research projects.",
            },
            {
                title: "Open Ecosystem",
                description: "Telescope is designed to work seamlessly with the existing suite of tools you and your team already use. From importing data from external sources to exporting your results and analyses. Telescope seamlessly integrates with your existing tools.",
            },
        ],
        graphic: "DiscoverGraphic.svg",
    }
]