const hre = require("hardhat");

async function main() {
  console.log("Starting deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy Roles
  console.log("Deploying Roles...");
  const Roles = await hre.ethers.getContractFactory("Roles");
  const roles = await Roles.deploy(deployer.address);
  await roles.waitForDeployment();
  const rolesAddress = await roles.getAddress();
  console.log("✅ Roles:", rolesAddress, "\n");

  // Deploy ElectionFactory
  console.log("Deploying ElectionFactory...");
  const ElectionFactory = await hre.ethers.getContractFactory("ElectionFactory");
  const factory = await ElectionFactory.deploy(rolesAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("✅ ElectionFactory:", factoryAddress, "\n");

  // Grant Election Manager role
  console.log("Granting Election Manager role...");
  await roles.addElectionManager(deployer.address);
  console.log("✅ Role granted\n");

  console.log("=".repeat(50));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(50));
  console.log("Roles:", rolesAddress);
  console.log("ElectionFactory:", factoryAddress);
  console.log("=".repeat(50));

  // Save to file
  const fs = require("fs");
  const data = {
    network: hre.network.name,
    Roles: rolesAddress,
    ElectionFactory: factoryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync("deployment.json", JSON.stringify(data, null, 2));
  console.log("\n✅ Saved to deployment.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});