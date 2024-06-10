import { Products } from "@/types/products";

export const Plans: Array<Products> = [
    // Plans
    {
        name: "Default",
        resources: {
            teams: 1,
            seats: 2,
            storage: 500
        }
    },
    {
        name: 'Student',
        resources: {
            teams: 5,
            seats: 10,
            storage: 1000
        }
    },
    {
        name: 'Researcher',
        resources: {
            teams: 2,
            seats: 10,
            storage: 1000
        }
    },
    {
        name: 'Team',
        resources: {
            teams: 5,
            seats: 25,
            storage: 5000
        }
    },
    {
        name: 'Enterprise',
        resources: {
            teams: 5,
            seats: 25,
            storage: 5000
        }
    },

    // Pay-per-use
    {
        name: 'ExtraTeam',
        resources: {
            teams: 1,
            seats: 0,
            storage: 0
        }
    },

    {
        name: 'ExtraSeat',
        resources: {
            teams: 0,
            seats: 1,
            storage: 0
        }
    },

    {
        name: 'ExtraStorage',
        resources: {
            teams: 0,
            seats: 0,
            storage: 1000
        }
    }
];
