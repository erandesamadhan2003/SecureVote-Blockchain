// scripts/verify.js
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Reading deployment info...\n");
  
  // Read deployment addresses
  const deploymentData = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
  const [deployer] = await hre.ethers.getSigners();

  console.log("Verifying contracts on Etherscan...\n");

  // Verify Roles
  console.log("1. Verifying Roles contract...");
  try {
    await hre.run("verify:verify", {
      address: deploymentData.Roles,
      constructorArguments: [deployer.address],
    });
    console.log("✅ Roles verified\n");
  } catch (error) {
    console.log("❌ Roles verification failed:", error.message, "\n");
  }

  // Verify ElectionFactory
  console.log("2. Verifying ElectionFactory contract...");
  try {
    await hre.run("verify:verify", {
      address: deploymentData.ElectionFactory,
      constructorArguments: [deploymentData.Roles],
    });
    console.log("✅ ElectionFactory verified\n");
  } catch (error) {
    console.log("❌ ElectionFactory verification failed:", error.message, "\n");
  }

  // If you have deployed elections, verify them too
  if (deploymentData.SampleElection) {
    console.log("3. Verifying Sample Election contract...");
    // You'll need to get the exact constructor arguments from the deployment
    console.log("⚠️  Election contracts need specific constructor arguments");
    console.log("    Verify manually on Etherscan if needed\n");
  }

  console.log("Verification complete!");
  console.log("View on Etherscan:");
  console.log(`Roles: https://sepolia.etherscan.io/address/${deploymentData.Roles}`);
  console.log(`Factory: https://sepolia.etherscan.io/address/${deploymentData.ElectionFactory}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});