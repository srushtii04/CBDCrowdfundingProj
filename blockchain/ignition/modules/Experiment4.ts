import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const Experiment4Module = buildModule(
    "Experiment4Module",
    (m) => {

        const campaignToken =
            m.contract("CampaignToken");


        const crowdfunding =
            m.contract(
                "Crowdfunding",
                [campaignToken]
            );


        m.call(
            campaignToken,
            "setMinter",
            [crowdfunding]
        );


        const liquidityPool =
            m.contract(
                "LiquidityPool",
                [campaignToken]
            );


        return {
            campaignToken,
            crowdfunding,
            liquidityPool
        };
    }
);


export default Experiment4Module;