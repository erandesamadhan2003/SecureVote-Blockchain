import { expect } from "chai";
import { ethers } from "ethers";
describe("Roles", function () {
    let roles: any;
    let superAdmin: any, electionManager: any, electionAuthority: any, voter: any, addr1: any, addr2: any;

    beforeEach(async function() {
        let provider = ethers.getDefaultProvider();
        console.log("Provider:", ethers);
    });

    it("Should assign superAdmin role to deployer", async function() {
        // Your test logic here

    });
});